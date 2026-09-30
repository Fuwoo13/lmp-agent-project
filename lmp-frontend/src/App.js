import React, { useState, useEffect } from 'react'; // 💡 useEffect 추가됨
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [sensorData, setSensorData] = useState('모든 설비 정상 작동 중 (CM-100 온도 45℃)');
  const [reportStatus, setReportStatus] = useState('none');
  
  // 💡 DB에서 불러온 과거 이력 데이터를 담을 상태 변수
  const [history, setHistory] = useState([]);

  // 💡 백엔드(api.py)에서 과거 이력(DB)을 불러오는 함수
  const fetchHistory = async () => {
    try {
      const response = await fetch('https://lmp-backend-api.onrender.com/api/reports-history');
      const result = await response.json();
      if (result.history) {
        setHistory(result.history);
      }
    } catch (error) {
      console.error('이력 불러오기 실패:', error);
    }
  };

  // 💡 화면이 처음 켜질 때 이력 불러오기 함수를 자동으로 한 번 실행
  useEffect(() => {
    fetchHistory();
  }, []);

  const triggerSensorAlert = () => {
    setSensorData("CM-100 모터 온도 85℃ 이상 경고 (위험 초과)");
    setReport('');
    setReportStatus('none');
    alert("🚨 [시스템 알림] 공장 현장 센서에서 위험 데이터가 수신되었습니다!\n즉시 AI 진단 및 보고서 생성을 진행하세요.");
  };

  const generateReport = async () => {
    setLoading(true);
    setReport('');
    setReportStatus('none');
    try {
      const response = await fetch('https://lmp-backend-api.onrender.com/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensor_data: sensorData }),
      });
      
      const result = await response.json();
      
      if (result.report || result.data) {
        setReport(result.report || result.data);
        setReportStatus('pending');
        
        // 💡 새 보고서가 생성되었으니, DB 이력 목록(사이드바)도 새로고침!
        fetchHistory(); 
      } else {
        setReport('보고서 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setReport('서버에 연결할 수 없습니다. FastAPI 서버가 켜져 있는지 확인해주세요.');
    }
    setLoading(false);
  };

  const handleWorkerApproval = () => {
    alert("👷‍♂️ [현장 작업자] 에어건 분진 제거 및 V벨트 장력 15kgf 조치를 완료했습니다.");
    setTimeout(() => {
      setSensorData("모터 온도 45℃ (조치 후 안정화됨)");
      setReportStatus('completed');
      alert("📡 [IoT 피드백] 센서 온도가 45℃로 정상화되었습니다.\n보고서가 최종 결재(완료) 처리됩니다.");
    }, 1500);
  };

  return (
    // 💡 화면 전체 레이아웃을 가로 배치(flex)로 변경하고 넓이를 1200px로 확장
    <div className="App" style={{ display: 'flex', gap: '30px', padding: '40px', fontFamily: '"Pretendard", sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* ========================================================= */}
      {/* 🗄️ 좌측 사이드바: 과거 안전 조치 이력 (DB 데이터 렌더링) */}
      {/* ========================================================= */}
      <div style={{ width: '30%', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e1e4e8', height: 'fit-content' }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50', fontSize: '18px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          🗄️ 안전 조치 이력 (DB 연동)
        </h3>
        
        {history.length === 0 ? (
          <p style={{ color: '#a0aec0', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>
            저장된 이력이 없습니다.<br/>새로운 보고서를 생성해 보세요.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {history.map((item) => (
              <li key={item.id} style={{ 
                backgroundColor: '#ffffff', padding: '15px', borderRadius: '8px', marginBottom: '10px', 
                border: '1px solid #edf2f7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' 
              }}>
                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '5px' }}>{item.date}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: item.sensor_data.includes('경고') ? '#e53e3e' : '#2d3748' }}>
                  {item.sensor_data}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ========================================================= */}
      {/* 🖥️ 우측 메인 대시보드: 시스템 제어 및 보고서 출력 */}
      {/* ========================================================= */}
      <div style={{ width: '70%' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50', fontSize: '32px', marginBottom: '10px' }}>L.M.P 멀티 에이전트 시스템</h1>
          <p style={{ color: '#7f8c8d', fontSize: '16px' }}>현장 안전(L.AX) · 설비 진단(M.AX) · 보고서 작성(P.AX)</p>
        </div>

        {/* 실시간 센서 수신반 */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #dee2e6', marginBottom: '30px' }}>
          <h3 style={{ marginTop: '0', color: '#495057', fontSize: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <span>📡 실시간 현장 IoT 센서 수신반</span>
            <span style={{ color: sensorData.includes('경고') ? '#e53e3e' : '#38a169' }}>
              {sensorData.includes('경고') ? '🔴 위험 상태' : '🟢 정상 가동'}
            </span>
          </h3>
          <input type="text" value={sensorData} readOnly style={{ width: '100%', padding: '12px', fontSize: '15px', borderRadius: '6px', border: sensorData.includes('경고') ? '2px solid #e53e3e' : '1px solid #ced4da', marginBottom: '15px', boxSizing: 'border-box', backgroundColor: sensorData.includes('경고') ? '#fff5f5' : '#ffffff', fontWeight: sensorData.includes('경고') ? 'bold' : 'normal' }} />
          <button onClick={triggerSensorAlert} style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(229, 62, 62, 0.2)' }}>
            🚨 (시연용) 센서 이상 데이터 강제 발생
          </button>
        </div>
        
        {/* 보고서 생성 버튼 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <button onClick={generateReport} disabled={loading || sensorData.includes('정상 작동')} style={{ padding: '16px 32px', fontSize: '18px', fontWeight: 'bold', backgroundColor: (loading || sensorData.includes('정상 작동')) ? '#bdc3c7' : '#2b6cb0', color: 'white', border: 'none', borderRadius: '8px', cursor: (loading || sensorData.includes('정상 작동')) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.3s ease', width: '100%' }}>
            {loading ? '에이전트들이 현장 데이터를 분석 중입니다... 🤖' : '일일 작업 보고서 자동 생성 (진단 가이드)'}
          </button>
        </div>

        {/* AI 보고서 결과 영역 */}
        {report && (
          <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', border: reportStatus === 'completed' ? '2px solid #38a169' : '2px solid #d69e2e', boxShadow: '0 8px 16px rgba(0,0,0,0.05)', color: '#24292e', lineHeight: '1.8', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-15px', left: '20px', backgroundColor: reportStatus === 'completed' ? '#38a169' : '#d69e2e', color: 'white', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
              {reportStatus === 'completed' ? '✅ 최종 조치 및 안전 검증 완료' : '⚠️ AI 진단 완료 (현장 조치 대기 중)'}
            </div>
            
            <ReactMarkdown components={{ h1: ({node, ...props}) => <h1 style={{ borderBottom: '2px solid #eaecef', paddingBottom: '10px', color: '#1a202c', marginTop: '10px' }} {...props} />, h3: ({node, ...props}) => <h3 style={{ color: '#2b6cb0', marginTop: '30px' }} {...props} />, strong: ({node, ...props}) => <strong style={{ color: '#e53e3e', backgroundColor: '#fff5f5', padding: '0 4px', borderRadius: '4px' }} {...props} />, li: ({node, ...props}) => <li style={{ marginBottom: '8px' }} {...props} /> }}>
              {report}
            </ReactMarkdown>

            {/* 작업자 승인 버튼 */}
            {reportStatus === 'pending' && (
              <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px dashed #e2e8f0', textAlign: 'center' }}>
                <p style={{ color: '#718096', marginBottom: '15px', fontWeight: 'bold' }}>
                  💡 AI가 작성한 권고안에 따라 현장 조치를 완료한 후 아래 버튼을 눌러주세요.
                </p>
                <button onClick={handleWorkerApproval} style={{ padding: '14px 28px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#319795', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(49, 151, 149, 0.3)' }}>
                  👷‍♂️ 현장 작업자: 가이드 기반 조치 완료 및 승인
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;