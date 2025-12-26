import React from 'react';

export const BubbleBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Deep gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 opacity-100"></div>
      
      {/* Light shafts - Mesh Gradient Effect */}
      <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ocean-600/20 via-ocean-900/5 to-transparent opacity-60 blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-600/20 via-teal-900/5 to-transparent opacity-40 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Floating Orbs - Aurora */}
      <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-ocean-500/10 rounded-full blur-[80px] animate-float mix-blend-screen" style={{ animationDelay: '0s' }}></div>
      <div className="absolute top-[40%] right-[20%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-float mix-blend-screen" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-[10%] left-[30%] w-80 h-80 bg-teal-500/10 rounded-full blur-[60px] animate-float mix-blend-screen" style={{ animationDelay: '4s' }}></div>
    </div>
  );
};
