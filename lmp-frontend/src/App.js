import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setReport('');
    try {
      const response = await fetch('https://lmp-backend-api.onrender.com/api/generate-report', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        setReport(result.data);
      } else {
        setReport('보고서 생성 중 오류가 발생했습니다: ' + result.message);
      }
    } catch (error) {
      setReport('서버에 연결할 수 없습니다. FastAPI 서버가 켜져 있는지 확인해주세요.');
    }
    setLoading(false);
  };

  return (
    <div className="App" style={{ padding: '40px', fontFamily: '"Pretendard", sans-serif', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* 헤더 섹션 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '32px', marginBottom: '10px' }}>
           L.M.P 멀티 에이전트 시스템
        </h1>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          현장 안전(L.AX) · 설비 진단(M.AX) · 보고서 작성(P.AX)
        </p>
      </div>
      
      {/* 컨트롤 섹션 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <button 
          onClick={generateReport} 
          disabled={loading}
          style={{
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            backgroundColor: loading ? '#bdc3c7' : '#0056b3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? '에이전트들이 현장 데이터를 분석 중입니다... 🤖' : '일일 작업 보고서 자동 생성'}
        </button>
      </div>

      {/* 결과 출력 섹션 (마크다운 렌더링) */}
      {report && (
        <div style={{
          backgroundColor: '#ffffff',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #e1e4e8',
          boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
          color: '#24292e',
          lineHeight: '1.8',
          textAlign: 'left'
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