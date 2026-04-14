export const CustomLoader = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <img
        src={"/loader.gif"}
        alt={"Loading..."}
        className="w-[80px] h-[80px] object-contain"
      />
      <div className="w-[200px] h-1 bg-white/20 rounded-md overflow-hidden relative mt-3">
        <div
          className="h-full bg-white/60 rounded-md"
          style={{
            animation: "slide 1.2s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
