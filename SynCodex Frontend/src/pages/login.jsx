import { Link, useNavigate } from "react-router-dom";
import lockIcon from "../assets/password_11817746 1.svg";
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

const Login = () => {
  useMeta();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post("/api/auth/login", formData);

      console.log("User logged in:", res.data);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token); // Store token
        localStorage.setItem("name", res.data.user.fullName);
        localStorage.setItem("email", res.data.user.email);
        toast.success("Login successful!");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login failed:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Login failed");
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
              <img src={lockIcon} alt="Secure Login" className="auth-icon" />
              <div className="auth-header">
                <h2 className="text-xl font-semibold text-[var(--primary-text)]">
                  Welcome back to <span className="gradient-text">SynCodex</span>
                </h2>
                <p className="text-[var(--tertiary-text)] text-sm mt-2">
                  Code, collaborate, and conquer in real-time
                </p>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="md:w-1/2 md:pl-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <h2 className="auth-title mb-0">Login</h2>
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
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full flex justify-center gap-2 relative"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <Link to="/forgot-password" className="auth-link text-sm">
                    Forgot Password?
                  </Link>
                </div>

                <div className="auth-divider"></div>

                <div className="auth-footer">
                  Don't have an account?{" "}
                  <Link to="/signup" className="auth-link">
                    Sign Up
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

export default Login;
