import { Link, useNavigate } from "react-router-dom";
import SignupNow from "../assets/followers_6081941 1.svg";
import { useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import { easeInOut, motion } from "motion/react";
import Scroll from "../components/scroll";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import AppColors from "../utils/appColors";
import useMeta from "../hooks/useMeta";

const SignUP = () => {
  useMeta();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const validateEmail = (email) => emailRegex.test(email);
  const validatePassword = (password) => passwordRegex.test(password);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      toast.error("Invalid Email!");
      return;
    }

    if (!validatePassword(formData.password)) {
      toast.error(
        "Password must be at least 8 characters, with one uppercase, one number, and one special character!"
      );
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/api/auth/register", formData);
      console.log("User registered:", res.data);
      toast.success("User registered successfully! Please login.");
      navigate("/login");
    } catch (error) {
      console.error("Registration failed:", error.response?.data || error);
      toast.error(error.response?.data.message || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Scroll />
      <Navbar hideStartCoding={true} />

      <div className="auth-container">
        <motion.div
          initial={{ opacity: 0.4, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            ease: easeInOut,
          }}
          className="w-full"
        >
          <div className="auth-card flex flex-col md:flex-row gap-8 md:gap-0">
            {/* Left Side - Illustration & Message */}
            <div className="flex flex-col items-center justify-center md:w-1/2 md:border-r md:border-[var(--border-color)] md:pr-8">
              <img src={SignupNow} alt="Join SynCodex" className="auth-icon" />
              <div className="auth-header">
                <h2 className="text-xl font-semibold text-[var(--primary-text)]">
                  Join <span className="gradient-text">SynCodex</span> today
                </h2>
                <p className="text-[var(--tertiary-text)] text-sm mt-2">
                  Code smarter, collaborate faster, innovate together seamlessly
                </p>
              </div>
            </div>

            {/* Right Side - Signup Form */}
            <div className="md:w-1/2 md:pl-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="auth-title mb-0">Create Account</h2>
                </div>

                <div className="form-group">
                  <label htmlFor="fullName" className="form-label">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="form-input pr-10"
                      required
                    />
                    <button
                      type="button"
                      name="Toggle password visibility"
                      title="Toggle password visibility"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--tertiary-text)] hover:text-[var(--primary-text)] transition cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--tertiary-text)] mt-2">
                    Must contain 8+ characters, uppercase, number & special character
                  </p>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full flex justify-center gap-2 relative"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>

                <div className="auth-divider"></div>

                <div className="auth-footer">
                  Already have an account?{" "}
                  <Link to="/login" className="auth-link">
                    Login
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </>
  );
};

export default SignUP;
