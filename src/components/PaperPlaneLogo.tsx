import React from "react";

interface LogoProps {
  className?: string;
  containerClassName?: string;
  iconSizeClassName?: string;
}

export default function PaperPlaneLogo({ 
  className = "text-white", 
  containerClassName = "w-10 h-10 bg-[#131d26] rounded-full flex items-center justify-center shadow-md shrink-0",
  iconSizeClassName = "w-6 h-6"
}: LogoProps) {
  return (
    <div className={containerClassName}>
      <svg 
        viewBox="0 0 1024 1024" 
        fill="currentColor" 
        className={`${iconSizeClassName} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Customized folded paper airplane to match user image */}
        <path d="M661.1 206.5L320.1 364.5c-30.8 14.2-30.8 37.2 0 51.4l155.6 71.9 220-192c10.4-9.1 19.9-4.2 12 4.4L481.5 504.6l54.8 118.9c25.4 55.1 41.2 5.5 41.2 5.5l140.7-366.5c11.3-29.4-15.1-53.1-57.1-56z" />
        <path d="M490.7 544.5L449 713c-7.8 31.6-20.9 8.2-20.9 8.2l-37.4-81.2" opacity="0.85" />
      </svg>
    </div>
  );
}
