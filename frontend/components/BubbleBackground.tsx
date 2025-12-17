import React from 'react';

export const BubbleBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Deep gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 opacity-100"></div>
      
      {/* Light shafts */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ocean-500/20 via-transparent to-transparent opacity-50 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent opacity-30 blur-3xl"></div>

      {/* Bubbles */}
      <div className="absolute top-[20%] left-[10%] w-32 h-32 bg-ocean-400/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '0s' }}></div>
      <div className="absolute top-[60%] right-[15%] w-48 h-48 bg-teal-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-[10%] left-[20%] w-24 h-24 bg-blue-500/10 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
    </div>
  );
};
