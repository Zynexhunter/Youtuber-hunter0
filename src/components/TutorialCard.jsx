import React, { useState } from 'react';

const TUTORIAL_URL = 'https://youtu.be/Qub8hP5aa5M?si=20Diku-S3XAGEQdh';
const TUTORIAL_THUMB_SRC = './assets/aistudio/file_00000000f96c8211ad324bfdc89796ec_c5a94e0a.png';

export default function TutorialCard({ onTutorialClick }) {
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = () => {
    if (onTutorialClick) onTutorialClick();
  };

  return (
    <div className="rounded-3xl border border-[#EAE3DB] p-5 sm:p-6 bg-white shadow-sm hover:shadow-md hover-lift transition-all duration-200 flex flex-col justify-between gap-3.5">
      <div className="space-y-3">
        {/* Native 16:9 Video Thumbnail Preview */}
        <a
          href={TUTORIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          aria-label="Watch Client Hunting Tutorial on YouTube"
          className="relative block aspect-video w-full rounded-2xl overflow-hidden border border-[#EAE3DB] bg-[#13100E] group focus-visible:outline-2 focus-visible:outline-[#FF3358]"
        >
          {!imgFailed ? (
            <img
              src={TUTORIAL_THUMB_SRC}
              alt="Zynex Hunter Client Hunting Tutorial"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#6B30FF] via-[#E62E7A] to-[#FF3358] text-white p-4 text-center">
              <span className="text-sm font-extrabold">Zynex Hunter Guide</span>
              <span className="text-xs opacity-90 mt-0.5">Step-by-step client hunting</span>
            </div>
          )}

          {/* Clean Play Icon Overlay */}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-[#FF3358]/95 group-hover:bg-[#FF1F48] text-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
              <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
          </div>
        </a>

        {/* Title & Concise Info */}
        <div>
          <h3 className="font-extrabold text-base text-neutral-950 leading-tight">
            Watch Tutorial to Find Clients
          </h3>
          <p className="text-xs text-neutral-500 font-medium mt-1 leading-relaxed">
            Step-by-step walkthrough on filtering YouTubers, saving leads &amp; pitching.
          </p>
        </div>
      </div>

      {/* Bottom Action Matching CreatorCard */}
      <div className="pt-3 border-t border-[#F0EAE3]">
        <a
          href={TUTORIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-[#FF3358] hover:bg-[#FF1F48] shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF3358]"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
          <span>Watch Tutorial</span>
        </a>
      </div>
    </div>
  );
}
