// Show the salon banner artwork so the public page has its visual introduction.
export function SalonArtwork({ interior = false }: { interior?: boolean }) {
  return (
    <div className={`salon-art tw:customer:[&_img]:w-full tw:customer:[&_img]:h-full tw:customer:[&_img]:min-h-[inherit] tw:customer:[&_img]:object-cover tw:customer:[&_img]:block  ${interior ? "interior-art" : ""}`}>
      {/* <div className="art-mirror tw:customer:absolute tw:customer:w-[52%] tw:customer:h-[76%] tw:customer:left-[24%]
          tw:customer:top-[8%] tw:customer:rounded-[48%_48%_2%_2%] tw:customer:[border:12px_solid_#d8bf80]" />
      <div className="art-chair tw:customer:absolute tw:customer:w-[42%] tw:customer:h-[26%] tw:customer:left-[29%]
          tw:customer:bottom-[7%] tw:customer:rounded-[30px_30px_8px_8px] tw:customer:[background:#3c4942]" />
      <span className="art-caption tw:customer:absolute tw:customer:bottom-6 tw:customer:left-7.5 tw:customer:text-[white]
          tw:customer:text-[12px]">A little time for yourself.</span> */}
      <img src="/images/banner.jpg" alt="Clique salon banner" />
    </div>
  );
}
