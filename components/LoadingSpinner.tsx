import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 max-w-sm mx-auto text-center">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">AI กำลังสร้างข้อสอบ...</h3>
      <p className="text-gray-600 animate-pulse text-sm leading-relaxed">
        ระบบกำลังวิเคราะห์แนวข้อสอบ สร้างโจทย์ <br/>และรูปภาพประกอบ (กราฟ/รูปทรง)
      </p>
      <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-xs text-yellow-800">
         หากเลือก "จำลองการสอบจริง (100 ข้อ)"<br/>อาจใช้เวลาประมาณ 30-60 วินาที
      </div>
    </div>
  );
};

export default LoadingSpinner;
