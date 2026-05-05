import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = ({ hideStartCoding }) => {
  const [open, setOpen] = useState(false);

  const location = useLocation(); // Get current route

  // Check if the current page is Login or Sign Up
  const isLoginPage = location.pathname === "/login";
  const isSignUpPage = location.pathname === "/signup";

  return (
    <header
      className="flex w-full items-center justify-center sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--primary-bg)]"
      style={{ 
        backgroundColor: 'rgba(11, 16, 32, 0.95)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div className="w-full px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <Link to={"/"} aria-label="Go to homepage" className="flex items-center gap-2">
              <img
                src="/SynCodex icon.png"
                alt="SynCodex icon"
                className="w-10 md:w-12 transition hover:scale-110"
              />
              <span className="hidden md:block font-Chakra text-3xl font-semibold gradient-text">
                SynCodex
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link
              to="/about"
              className="text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition"
            >
              Contact
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {!hideStartCoding && (
              <Link to="/signup" className="btn btn-primary hidden sm:inline-flex">
                Get Started
              </Link>
            )}

            {isLoginPage ? (
              <Link to="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            ) : isSignUpPage ? (
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              aria-controls="navbarToggler"
              name="navbarToggler"
              title="Toggle navigation"
              onClick={() => setOpen(!open)}
              id="navbarToggler"
              className={`lg:hidden flex flex-col gap-1.5 p-2 rounded transition ${
                open ? 'bg-[var(--hover-bg)]' : ''
              }`}
            >
              <span className={`block h-0.5 w-6 bg-[var(--primary-text)] transition transform ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block h-0.5 w-6 bg-[var(--primary-text)] transition ${open ? 'opacity-0' : ''}`}></span>
              <span className={`block h-0.5 w-6 bg-[var(--primary-text)] transition transform ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {open && (
          <nav className="lg:hidden border-t border-[var(--border-color)] py-4 px-4 space-y-3 bg-[var(--secondary-bg)] rounded-b-lg">
            <Link
              to="/about"
              className="block text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition py-2"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className="block text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition py-2"
            >
              Contact Us
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;

const ListItem = ({ children, NavLink }) => {
  return (
    <>
      <li>
        <a
          href={NavLink}
          className="flex py-2 text-base font-medium text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white lg:ml-12 lg:inline-flex"
        >
          {children}
        </a>
      </li>
    </>
  );
};
