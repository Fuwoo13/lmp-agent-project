import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './App.css';

function App() {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [sensorData, setSensorData] = useState('모든 설비 정상 작동 중 (CM-100 온도 45℃)');
  const [reportStatus, setReportStatus] = useState('none');
  const [history, setHistory] = useState([]);
  const [scenario, setScenario] = useState("CM-100 모터 온도 85℃ 이상 경고 (과열 위험)");
  
  const [isListening, setIsListening] = useState(false);
  const [uploadImage, setUploadImage] = useState(null);
  const reportRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch('https://lmp-backend-api.onrender.com/api/reports-history');
      const result = await response.json();
      if (result.history) setHistory(result.history);
    } catch (error) {
      console.error('이력 불러오기 실패:', error);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const chartData = [
    { name: '모터 과열', value: history.filter(h => h.sensor_data.includes('모터')).length || 1 },
    { name: '프레스 유압', value: history.filter(h => h.sensor_data.includes('프레스')).length || 1 },
    { name: '화학 밸브', value: history.filter(h => h.sensor_data.includes('밸브')).length || 1 }
  ];
  const COLORS = ['#e53e3e', '#d69e2e', '#3182ce'];

  const triggerSensorAlert = () => {
    setSensorData(scenario);
    setReport('');
    setReportStatus('none');
    setUploadImage(null);
    alert(`🚨 [시스템 알림] ${scenario.split(' ')[0]} 설비에서 위험 데이터가 수신되었습니다!`);
  };

  // 💡 신규: 실시간 창원 날씨(Open-Meteo API)를 불러오는 함수 (API 키 불필요)
  const getRealTimeWeather = async () => {
    try {
      // 창원의 위도(35.2281)와 경도(128.6811)를 기반으로 날씨 데이터 요청
      const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=35.2281&longitude=128.6811&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul");
      const data = await response.json();
      
      const currentTemp = data.current_weather.temperature; // 현재 기온
      const maxTemp = data.daily.temperature_2m_max[0];     // 최고 기온
      const minTemp = data.daily.temperature_2m_min[0];     // 최저 기온
      
      // 현재 '월'을 기준으로 봄, 여름, 가을, 겨울 자동 계산
      const month = new Date().getMonth() + 1;
      let season = "겨울";
      if (month >= 3 && month <= 5) season = "봄";
      else if (month >= 6 && month <= 8) season = "여름";
      else if (month >= 9 && month <= 11) season = "가을";

      // AI가 찰떡같이 이해할 수 있도록 문장으로 조립해서 리턴
      return `현재 계절은 ${season}이며, 기온은 ${currentTemp}℃ (오늘 최저 ${minTemp}℃ / 최고 ${maxTemp}℃) 입니다.`;
    } catch (error) {
      console.error("날씨 연동 실패", error);
      return "날씨 데이터 수신 오류";
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setReport('');
    setReportStatus('none');

    const now = new Date();
    const currentTimestamp = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;
    const currentLocation = "창원국가산업단지 (제1공장)"; 
    
    // 💡 핵심: 날씨 함수를 호출하여 실시간 문자열을 받아옵니다.
    const currentWeather = await getRealTimeWeather();

    try {
      const response = await fetch('https://lmp-backend-api.onrender.com/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 💡 백엔드로 보낼 때 weather 데이터도 함께 발송!
        body: JSON.stringify({ 
          sensor_data: sensorData, 
          timestamp: currentTimestamp, 
          location: currentLocation,
          weather: currentWeather 
        }),
      });
      const result = await response.json();
      if (result.report || result.data) {
        setReport(result.report || result.data);
        setReportStatus('pending');
        fetchHistory(); 
      }
    } catch (error) {
      setReport('서버 통신 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  const handleVoiceApproval = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저에서는 음성 인식을 지원하지 않습니다. 크롬을 사용해주세요.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      alert(`🎙️ 현장 음성 인식 완료: "${transcript}"\n사진 검증을 생략하고 음성 명령으로 즉시 승인을 진행합니다.`);
      setIsListening(false);
      
      setTimeout(() => {
        setSensorData("모든 설비 정상 작동 중 (음성 조치 승인 완료)");
        setReportStatus('completed');
        alert("✅ [최종 검증 완료] 음성 승인 및 IoT 센서 정상화가 확인되었습니다.\n보고서를 최종 결재합니다.");
      }, 1000);
    };
    
    recognition.onerror = () => {
      alert("음성 인식이 취소되었거나 실패했습니다.");
      setIsListening(false);
    };
  };

  const handleWorkerApproval = async () => {
    if (!uploadImage) {
      alert("⚠️ 조치 완료 사진을 먼저 업로드해 주세요! (비전 AI 검증용)");
      return;
    }
    
    alert("🔍 [Vision AI] 업로드된 조치 사진을 분석 중입니다...\n(백엔드로 사진을 전송하고 있습니다.)");
    
    const formData = new FormData();
    formData.append("file", uploadImage);

    try {
      const response = await fetch('https://lmp-backend-api.onrender.com/api/verify-image', {
        method: 'POST',
        body: formData, 
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        alert(`🤖 [AI 비전 판독 결과]\n\n${result.message}`);
        
        if (result.message.includes('통과')) {
          setSensorData("모든 설비 정상 작동 중 (조치 후 안정화됨)");
          setReportStatus('completed');
          alert("✅ [최종 검증 완료] 조치 사진 판독 및 IoT 센서 정상화가 확인되었습니다.\n보고서를 최종 결재합니다.");
        } else {
          alert("⚠️ AI가 재조치를 요구했습니다. 현장 조치를 다시 확인하고 사진을 다시 올려주세요.");
        }
      } else {
        alert("❌ 사진 판독에 실패했습니다.");
      }
    } catch (error) {
      alert("서버 통신 오류가 발생했습니다. FastAPI 서버 상태를 확인해주세요.");
    }
  };

  const exportPDF = () => {
    html2canvas(reportRef.current).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save("LMP_안전조치보고서.pdf");
    });
  };

  const isErrorState = !sensorData.includes('정상 작동');

  return (
    <div className="App" style={{ display: 'flex', gap: '30px', padding: '40px', fontFamily: '"Pretendard", sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 🗄 좌측 사이드바 */}
      <div style={{ width: '30%', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e1e4e8', height: 'fit-content' }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50', fontSize: '18px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          📊 설비별 위험 감지 통계
        </h3>
        <div style={{ height: '200px', marginBottom: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip /> <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <h3 style={{ color: '#2c3e50', fontSize: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>🗄️ 최근 조치 이력</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.slice(0,3).map((item) => (
            <li key={item.id} style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #edf2f7', fontSize:'13px' }}>
              <div style={{ color: '#718096', marginBottom: '5px' }}>{item.date}</div>
              <div style={{ fontWeight: 'bold', color: !item.sensor_data.includes('정상') ? '#e53e3e' : '#2d3748' }}>{item.sensor_data}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* 🖥️ 우측 메인 대시보드 */}
      <div style={{ width: '70%' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50', fontSize: '32px', marginBottom: '10px' }}>L.M.P 멀티 에이전트 시스템</h1>
          <p style={{ color: '#7f8c8d', fontSize: '16px' }}>현장 안전(L.AX) · 설비 진단(M.AX) · 보고서 작성(P.AX)</p>
        </div>

        {/* 📡 실시간 센서 수신반 */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #dee2e6', marginBottom: '30px' }}>
          <h3 style={{ marginTop: '0', color: '#495057', fontSize: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <span>📡 실시간 현장 IoT 센서 수신반</span>
            <span style={{ color: isErrorState ? '#e53e3e' : '#38a169' }}>
              {isErrorState ? '🔴 위험 상태' : '🟢 정상 가동'}
            </span>
          </h3>
          <input type="text" value={sensorData} readOnly style={{ width: '100%', padding: '12px', fontSize: '15px', borderRadius: '6px', border: isErrorState ? '2px solid #e53e3e' : '1px solid #ced4da', marginBottom: '15px', backgroundColor: isErrorState ? '#fff5f5' : '#ffffff', fontWeight: isErrorState ? 'bold' : 'normal' }} />
          
          <div style={{ marginBottom: '15px', textAlign: 'left' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a5568' }}>설비 고장 시나리오 선택:</label>
            <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px' }}>
              <option value="CM-100 모터 온도 85℃ 이상 경고 (과열 위험)">[제1공장] CM-100 컨베이어 모터 과열</option>
              <option value="PR-200 프레스기 유압 40bar 미만 경고 (압력 저하)">[제2공장] PR-200 프레스기 유압 저하</option>
              <option value="VL-50 화학물질 밸브 유해가스 농도 20ppm 감지 (누출 위험)">[제3공장] VL-50 화학물질 밸브 누출</option>
            </select>
          </div>
          <button onClick={triggerSensorAlert} style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🚨 (시연용) 센서 이상 데이터 강제 발생</button>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <button onClick={generateReport} disabled={loading || !isErrorState} style={{ padding: '16px 32px', fontSize: '18px', fontWeight: 'bold', backgroundColor: (loading || !isErrorState) ? '#bdc3c7' : '#2b6cb0', color: 'white', border: 'none', borderRadius: '8px', cursor: (loading || !isErrorState) ? 'not-allowed' : 'pointer', width: '100%' }}>
            {loading ? '에이전트들이 현장 매뉴얼을 탐색 중입니다... 🤖' : '일일 작업 보고서 자동 생성 (진단 가이드)'}
          </button>
        </div>

        {/* AI 보고서 결과 영역 */}
        {report && (
          <div ref={reportRef} style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', border: reportStatus === 'completed' ? '2px solid #38a169' : '2px solid #d69e2e', boxShadow: '0 8px 16px rgba(0,0,0,0.05)', color: '#24292e', lineHeight: '1.8', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-15px', left: '20px', backgroundColor: reportStatus === 'completed' ? '#38a169' : '#d69e2e', color: 'white', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
              {reportStatus === 'completed' ? '✅ 최종 조치 및 안전 검증 완료' : '⚠️ AI 진단 완료 (현장 조치 대기 중)'}
            </div>
            
            <button onClick={exportPDF} style={{ position: 'absolute', top: '15px', right: '20px', padding: '8px 15px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
              📄 PDF로 저장
            </button>
            
            <ReactMarkdown components={{ h1: ({node, ...props}) => <h1 style={{ borderBottom: '2px solid #eaecef', paddingBottom: '10px', color: '#1a202c', marginTop: '10px' }} {...props} />, h3: ({node, ...props}) => <h3 style={{ color: '#2b6cb0', marginTop: '30px' }} {...props} />, strong: ({node, ...props}) => <strong style={{ color: '#e53e3e', backgroundColor: '#fff5f5', padding: '0 4px', borderRadius: '4px' }} {...props} /> }}>
              {report}
            </ReactMarkdown>

            {reportStatus === 'pending' && (
              <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px dashed #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                <p style={{ color: '#718096', fontWeight: 'bold', margin: 0 }}>📸 조치 완료 사진 업로드 (Vision AI 검증)</p>
                <input type="file" accept="image/*" onChange={(e) => setUploadImage(e.target.files[0])} style={{ padding: '10px', border: '1px solid #cbd5e0', borderRadius: '5px' }} />
                
                <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                  <button onClick={handleWorkerApproval} style={{ padding: '14px 28px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#319795', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    👷‍♂️ 사진 기반 조치 승인
                  </button>
                  <button onClick={handleVoiceApproval} style={{ padding: '14px 20px', fontSize: '16px', fontWeight: 'bold', backgroundColor: isListening ? '#e53e3e' : '#2b6cb0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    {isListening ? '🎙️ 듣는 중...' : '🎙️ 음성으로 승인 (단독)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;