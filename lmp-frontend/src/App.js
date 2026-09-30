import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 💡 센서 상태 관리
  const [sensorData, setSensorData] = useState('모든 설비 정상 작동 중 (CM-100 온도 45℃)');
  
  // 🚨 보고서 결재 상태 관리 ('none', 'pending', 'completed')
  const [reportStatus, setReportStatus] = useState('none');

  // [시뮬레이션 0단계] 가상 IoT 센서 에러 트리거
  const triggerSensorAlert = () => {
    setSensorData("CM-100 모터 온도 85℃ 이상 경고 (위험 초과)");
    setReport('');
    setReportStatus('none');
    alert("🚨 [시스템 알림] 공장 현장 센서에서 위험 데이터가 수신되었습니다!\n즉시 AI 진단 및 보고서 생성을 진행하세요.");
  };

  // [시뮬레이션 1단계] AI 보고서 생성 (미조치 상태)
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
        setReportStatus('pending'); // ⚠️ 보고서가 나왔지만 '미조치(승인 대기)' 상태로 설정
      } else {
        setReport('보고서 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setReport('서버에 연결할 수 없습니다. FastAPI 서버가 켜져 있는지 확인해주세요.');
    }
    setLoading(false);
  };

  // [시뮬레이션 2~3단계] 작업자 개입 및 센서 피드백 검증
  const handleWorkerApproval = () => {
    // 1. 작업자가 승인 버튼을 누름을 확인
    alert("👷‍♂️ [현장 작업자] 에어건 분진 제거 및 V벨트 장력 15kgf 조치를 완료했습니다.");
    
    // 2. 센서 데이터가 정상(60도 이하)으로 떨어지는 것을 시뮬레이션
    setTimeout(() => {
      setSensorData("모터 온도 45℃ (조치 후 안정화됨)");
      setReportStatus('completed'); // ✅ AI 최종 검증 및 '완료' 상태로 전환
      alert("📡 [IoT 피드백] 센서 온도가 45℃로 정상화되었습니다.\n보고서가 최종 결재(완료) 처리됩니다.");
    }, 1500); // 1.5초 뒤에 센서 정상화 연출
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

      {/* 📡 실시간 현장 IoT 센서 수신반 */}
      <div style={{ 
        backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', 
        border: '1px solid #dee2e6', marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: '0', color: '#495057', fontSize: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>📡 실시간 현장 IoT 센서 수신반</span>
          <span style={{ color: sensorData.includes('경고') ? '#e53e3e' : '#38a169' }}>
            {sensorData.includes('경고') ? '🔴 위험 상태' : '🟢 정상 가동'}
          </span>
        </h3>
        
        <input 
          type="text" 
          value={sensorData} 
          readOnly
          style={{
            width: '100%', padding: '12px', fontSize: '15px', borderRadius: '6px',
            border: sensorData.includes('경고') ? '2px solid #e53e3e' : '1px solid #ced4da',
            marginBottom: '15px', boxSizing: 'border-box',
            backgroundColor: sensorData.includes('경고') ? '#fff5f5' : '#ffffff',
            fontWeight: sensorData.includes('경고') ? 'bold' : 'normal'
          }}
        />

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
      
      {/* AI 보고서 생성 버튼 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <button 
          onClick={generateReport} 
          disabled={loading || sensorData.includes('정상 작동')}
          style={{
            padding: '16px 32px', fontSize: '18px', fontWeight: 'bold',
            backgroundColor: (loading || sensorData.includes('정상 작동')) ? '#bdc3c7' : '#2b6cb0', 
            color: 'white', border: 'none', borderRadius: '8px', 
            cursor: (loading || sensorData.includes('정상 작동')) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.3s ease', width: '100%'
          }}
        >
          {loading ? '에이전트들이 현장 데이터를 분석 중입니다... 🤖' : '일일 작업 보고서 자동 생성 (진단 가이드)'}
        </button>
      </div>

      {/* ⚠️ HITL: 보고서 결과 및 인간 개입 UI 섹션 */}
      {report && (
        <div style={{
          backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px',
          border: reportStatus === 'completed' ? '2px solid #38a169' : '2px solid #d69e2e', 
          boxShadow: '0 8px 16px rgba(0,0,0,0.05)', color: '#24292e', lineHeight: '1.8', textAlign: 'left',
          position: 'relative'
        }}>
          {/* 상태 뱃지 (미조치 vs 조치 완료) */}
          <div style={{
            position: 'absolute', top: '-15px', left: '20px', 
            backgroundColor: reportStatus === 'completed' ? '#38a169' : '#d69e2e', 
            color: 'white', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px'
          }}>
            {reportStatus === 'completed' ? '✅ 최종 조치 및 안전 검증 완료' : '⚠️ AI 진단 완료 (현장 조치 대기 중)'}
          </div>

          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 style={{ borderBottom: '2px solid #eaecef', paddingBottom: '10px', color: '#1a202c', marginTop: '10px' }} {...props} />,
              h3: ({node, ...props}) => <h3 style={{ color: '#2b6cb0', marginTop: '30px' }} {...props} />,
              strong: ({node, ...props}) => <strong style={{ color: '#e53e3e', backgroundColor: '#fff5f5', padding: '0 4px', borderRadius: '4px' }} {...props} />,
              li: ({node, ...props}) => <li style={{ marginBottom: '8px' }} {...props} />
            }}
          >
            {report}
          </ReactMarkdown>

          {/* 👷‍♂️ 2단계 인간 개입: 현장 작업자 조치 승인 버튼 */}
          {reportStatus === 'pending' && (
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px dashed #e2e8f0', textAlign: 'center' }}>
              <p style={{ color: '#718096', marginBottom: '15px', fontWeight: 'bold' }}>
                💡 AI가 작성한 권고안에 따라 현장 조치를 완료한 후 아래 버튼을 눌러주세요.
              </p>
              <button 
                onClick={handleWorkerApproval} 
                style={{
                  padding: '14px 28px', fontSize: '16px', fontWeight: 'bold',
                  backgroundColor: '#319795', color: 'white', border: 'none', borderRadius: '8px', 
                  cursor: 'pointer', boxShadow: '0 4px 6px rgba(49, 151, 149, 0.3)'
                }}
              >
                👷‍♂️ 현장 작업자: 가이드 기반 조치 완료 및 승인
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;