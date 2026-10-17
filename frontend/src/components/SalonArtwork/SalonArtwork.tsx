export function SalonArtwork({ interior = false }: { interior?: boolean }) {
  return (
    <div className={`salon-art ${interior ? "interior-art" : ""}`}>
      {/* <div className="art-mirror" />
      <div className="art-chair" />
      <span className="art-caption">A little time for yourself.</span> */}
      <img src="/images/banner.jpg" alt="Clique salon banner" />
    </div>
  );
}
