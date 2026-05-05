import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--primary-bg)] text-[var(--secondary-text)]">
      <div className="w-full bg-[var(--secondary-bg)] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col">
              <h3 className="text-[var(--primary-text)] font-semibold text-sm mb-3">Resources</h3>
              <Link to="/faq" className="text-xs hover:text-[var(--accent-primary)] transition">
                FAQ
              </Link>
              <Link to="/about" className="text-xs hover:text-[var(--accent-primary)] transition">
                About
              </Link>
            </div>

            <div className="flex flex-col">
              <h3 className="text-[var(--primary-text)] font-semibold text-sm mb-3">Company</h3>
              <Link to="/contact" className="text-xs hover:text-[var(--accent-primary)] transition">
                Contact
              </Link>
              <Link to="/licences" className="text-xs hover:text-[var(--accent-primary)] transition">
                Licenses
              </Link>
            </div>

            <div className="flex flex-col">
              <h3 className="text-[var(--primary-text)] font-semibold text-sm mb-3">Legal</h3>
              <a href="#privacy" className="text-xs hover:text-[var(--accent-primary)] transition">
                Privacy
              </a>
              <a href="#terms" className="text-xs hover:text-[var(--accent-primary)] transition">
                Terms
              </a>
            </div>

            <div className="flex flex-col items-start md:items-end">
              <div className="font-gradient font-Chakra text-lg font-bold mb-2">
                SynCodex
              </div>
              <p className="text-xs text-[var(--tertiary-text)]">
                Code, collaborate, conquer
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="py-6 px-4 border-t border-[var(--border-color)] text-center">
        <p className="text-xs text-[var(--tertiary-text)]">
          © 2025 <span className="font-semibold text-[var(--primary-text)]">SynCodex</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
