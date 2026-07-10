import '../styles/styles.css';

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[#c9a3e0] border border-gray-500 px-2 py-1 text-black">
    {children}
  </div>
);

const ArtistProfile: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header bar */}
      <header className="bg-[#a5a5ee] flex items-center justify-between px-6 py-4">
        <div className="bg-gray-200 h-12 w-40 flex items-center justify-center text-black">
          Logo
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gray-50 rounded-full px-8 py-3 font-bold text-black">
            Search
          </div>
          <div className="bg-gray-50 rounded-full px-8 py-3 font-bold text-black">
            Credits: 0000
          </div>
        </div>
      </header>

      {/* Lavender page area */}
      <div className="bg-[#e8ccf5] px-6 py-8 flex justify-center">
        {/* White content card */}
        <div className="bg-gray-50 w-full max-w-4xl px-10 py-6">
          {/* Top links */}
          <div className="flex justify-end gap-2 text-black mb-6">
            <a href="#">Help</a>
            <span>|</span>
            <a href="#">Log out</a>
          </div>

          {/* Name and stats */}
          <div className="flex flex-wrap items-start gap-x-6 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-black">Chromatone</h1>
              <a href="#" className="text-black">[edit profile]</a>
            </div>
            <p className="text-black mt-3">
              100/100 (69) | 420 sales | 67 years on CommIt
            </p>
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left column */}
            <div>
              {/* Profile image placeholder */}
              <div className="bg-gray-200 w-56 h-56 flex items-end justify-center">
                <div className="flex flex-col items-center pb-6">
                  <div className="w-20 h-20 rounded-full bg-[#e87fd8]" />
                  <div className="w-20 h-16 bg-[#e87fd8] mt-2" />
                </div>
              </div>
              <p className="text-black mt-2">
                view my: <a href="#">items</a> | <a href="#">all reviews</a>
              </p>

              {/* Contacting box */}
              <div className="mt-6 border border-gray-500">
                <SectionHeader>Contacting Chromatone</SectionHeader>
                <div className="grid grid-cols-2 gap-y-2 p-3 h-40 content-start text-black">
                  <div>&#9734; <a href="#">Follow</a></div>
                  <div>&#9734; <a href="#">Add to favs</a></div>
                  <div>&#9734; <a href="#">Message</a></div>
                  <div>&#9734; <a href="#">Block</a></div>
                </div>
              </div>

              {/* CommIt URL box */}
              <div className="mt-6 border border-gray-500 p-3 text-black">
                <p className="font-bold">CommIt URL:</p>
                <p>https://inserturlhere</p>
                <a href="#">[edit]</a>
              </div>

              {/* Links box */}
              <div className="mt-6 border border-gray-500">
                <SectionHeader>Chromatone&apos;s Links</SectionHeader>
                <div className="grid grid-cols-2 gap-y-2 p-3 text-black">
                  <div>&#9734; <a href="#">Instagram</a></div>
                  <div>&#9734; <a href="#">Portfolio</a></div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div>
              {/* About me */}
              <div>
                <SectionHeader>About me:</SectionHeader>
                <div className="p-1 text-black">
                  <a href="#">[edit]</a>
                </div>
              </div>

              {/* Followers */}
              <div className="mt-16">
                <SectionHeader>Chromatone&apos;s Followers</SectionHeader>
                <p className="text-black mt-3">Chromatone has 1 follower</p>
                <div className="w-28 h-28 mt-3 bg-[#d6295a] flex items-end justify-center">
                  <div className="flex flex-col items-center pb-3">
                    <div className="w-8 h-8 rounded-full bg-[#e87fd8]" />
                    <div className="w-8 h-6 bg-[#e87fd8] mt-1" />
                  </div>
                </div>
                <p className="text-black mt-2">John Rizzler Pork</p>
              </div>

              {/* Recent Reviews */}
              <div className="mt-4">
                <SectionHeader>Chromatone&apos;s Recent Reviews</SectionHeader>
                <p className="text-black font-bold mt-3">Displaying 0 of 0 reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfile;
