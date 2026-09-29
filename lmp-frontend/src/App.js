import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 💡 추가된 부분 1: 센서 상태를 관리하는 변수 (기본값: 정상)
  const [sensorData, setSensorData] = useState('모든 설비 정상 작동 중 (CM-100 온도 45도)');

  // 🚨 추가된 부분 2: 가상 IoT 센서 트리거 함수 (버튼 누르면 실행)
  const triggerSensorAlert = () => {
    setSensorData("CM-100 모터 온도 85도 이상 경고 (위험 초과)");
    alert("🚨 [시스템 알림] 공장 현장 센서에서 위험 데이터가 수신되었습니다!\n즉시 AI 진단 및 보고서 생성을 진행하세요.");
  };

  const generateReport = async () => {
    setLoading(true);
    setReport('');
    try {
      const response = await fetch('https://lmp-backend-api.onrender.com/api/generate-report', { // api.py 주소 확인 필요 시 '/api/generate-report'로 원복
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // 💡 JSON 데이터를 보낸다고 명시
        },
        // 💡 추가된 부분 3: 현재 센서 상태 데이터를 백엔드로 전송
        body: JSON.stringify({ sensor_data: sensorData }),
      });
      
      const result = await response.json();
      
      // 💡 추가된 부분 4: 백엔드(api.py)의 변경된 반환 형식(report)에 맞춤
      if (result.report) {
        setReport(result.report);
      } else if (result.data) { // (구버전 호환용)
        setReport(result.data);
      } else {
        setReport('보고서 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setReport('서버에 연결할 수 없습니다. FastAPI 서버가 켜져 있는지 확인해주세요.');
    }
    setLoading(false);
  };

  return (
    <div className="App" style={{ padding: '40px', fontFamily: '"Pretendard", sans-serif', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* 헤더 섹션 */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '32px', marginBottom: '10px' }}>
           L.M.P 멀티 에이전트 시스템
        </h1>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          현장 안전(L.AX) · 설비 진단(M.AX) · 보고서 작성(P.AX)
        </p>
      </div>

      {/* 💡 시연용 센서 대시보드 섹션 (새로 추가됨) */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '10px', 
        border: '1px solid #dee2e6',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: '0', color: '#495057', fontSize: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>📡 실시간 현장 IoT 센서 수신반</span>
          <span style={{ color: sensorData.includes('경고') ? '#e53e3e' : '#38a169' }}>
            {sensorData.includes('경고') ? '🔴 위험 상태' : '🟢 정상 가동'}
          </span>
        </h3>
        
        {/* 센서 데이터 입력/출력 창 */}
        <input 
          type="text" 
          value={sensorData} 
          onChange={(e) => setSensorData(e.target.value)}
          style={{
            width: '100%', padding: '12px', fontSize: '15px', borderRadius: '6px',
            border: sensorData.includes('경고') ? '2px solid #e53e3e' : '1px solid #ced4da',
            marginBottom: '15px', boxSizing: 'border-box',
            backgroundColor: sensorData.includes('경고') ? '#fff5f5' : '#ffffff',
            fontWeight: sensorData.includes('경고') ? 'bold' : 'normal'
          }}
        />

        {/* 🚨 긴급 에러 발생 버튼 */}
        <button 
          onClick={triggerSensorAlert} 
          style={{ 
            width: '100%', padding: '12px', fontSize: '15px', fontWeight: 'bold',
            backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px',
            cursor: 'pointer', boxShadow: '0 4px 6px rgba(229, 62, 62, 0.2)'
          }}
        >
          🚨 (시연용) 센서 이상 데이터 강제 발생
        </button>
      </div>
      
      {/* 컨트롤 섹션 (에이전트 가동) */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <button 
          onClick={generateReport} 
          disabled={loading}
          style={{
            padding: '16px 32px', fontSize: '18px', fontWeight: 'bold',
            backgroundColor: loading ? '#bdc3c7' : '#2b6cb0', color: 'white',
            border: 'none', borderRadius: '8px', cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.3s ease', width: '100%'
          }}
        >
          {loading ? '에이전트들이 현장 데이터를 분석 중입니다... 🤖' : '일일 작업 보고서 자동 생성'}
        </button>
      </div>

      {/* 결과 출력 섹션 (마크다운 렌더링) */}
      {report && (
        <div style={{
          backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px',
          border: '1px solid #e1e4e8', boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
          color: '#24292e', lineHeight: '1.8', textAlign: 'left'
        }}>
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 style={{ borderBottom: '2px solid #eaecef', paddingBottom: '10px', color: '#1a202c' }} {...props} />,
              h3: ({node, ...props}) => <h3 style={{ color: '#2b6cb0', marginTop: '30px' }} {...props} />,
              strong: ({node, ...props}) => <strong style={{ color: '#e53e3e', backgroundColor: '#fff5f5', padding: '0 4px', borderRadius: '4px' }} {...props} />,
              li: ({node, ...props}) => <li style={{ marginBottom: '8px' }} {...props} />
            }}
          >
            {report}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default App;