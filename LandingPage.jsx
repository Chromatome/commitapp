import React, { useState } from "react";

export default function LandingPage() {
  const [view, setView] = useState("home"); // "home" | "about"

  return (
    <div className="w-full min-h-screen flex flex-col">
      <header
        className="relative w-full flex flex-col min-h-screen"
        style={{
          backgroundColor: "#ECC9EF",
          backgroundImage: `
            linear-gradient(to right, #A8ACF3 1px, transparent 1px),
            linear-gradient(to bottom, #A8ACF3 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      >
        {/* Top Navigation */}
        <nav className="w-full flex items-center justify-between px-10 py-6">
          <button
            type="button"
            onClick={() => setView("home")}
            className="font-bold text-base"
            style={{ color: "#000000" }}
          >
            CommIt
          </button>

          <div className="flex items-center gap-8">
            <a
              href="#become-creator"
              className="font-bold text-base hover:underline"
              style={{ color: "#000000" }}
            >
              Become a creator!
            </a>
            <a
              href="#sign-in"
              className="font-bold text-base hover:underline"
              style={{ color: "#000000" }}
            >
              Sign in/Sign up
            </a>
          </div>
        </nav>

        {/* Main content area, switches between home and about */}
        <div className="flex flex-col items-center justify-center flex-1 px-8 pb-24 pt-4">
          {view === "home" && (
            <>
              <img
                src="/commit-logo.png"
                alt="CommIt Logo"
                className="w-64 h-auto mx-auto"
              />

              <div className="flex flex-row gap-6 mt-8">
                <button
                  type="button"
                  onClick={() => window.alert("Let's get you started! (connect this to your signup flow)")}
                  className="rounded-none px-8 py-3 text-white font-semibold text-base transition-colors duration-150"
                  style={{ backgroundColor: "#A8ACF3" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C22378")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#A8ACF3")}
                >
                  Get Started
                </button>
                <button
                  type="button"
                  onClick={() => setView("about")}
                  className="rounded-none px-8 py-3 text-white font-semibold text-base transition-colors duration-150"
                  style={{ backgroundColor: "#A8ACF3" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C22378")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#A8ACF3")}
                >
                  About Us
                </button>
              </div>
            </>
          )}

          {view === "about" && (
            <div className="w-full max-w-2xl flex flex-col items-center">
              <h1
                className="text-4xl font-extrabold text-center"
                style={{ color: "#101B54" }}
              >
                About CommIt
              </h1>
              <p
                className="mt-6 text-center text-lg leading-relaxed"
                style={{ color: "#101B54" }}
              >
                CommIt is a platform where buyers and freelance artists can guarantee mutual satisfaction, easily.
              </p>

              <button
                type="button"
                onClick={() => setView("home")}
                className="rounded-none px-8 py-3 text-white font-semibold text-base transition-colors duration-150 mt-10"
                style={{ backgroundColor: "#A8ACF3" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C22378")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#A8ACF3")}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
