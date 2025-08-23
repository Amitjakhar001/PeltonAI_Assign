import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authAPI } from "../services/api";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      login(response.data.user, response.data.token);
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.data?.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach((error) => {
          fieldErrors[error.path] = error.msg;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({
          general: err.response?.data?.message || "Registration failed",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <input
                name="username"
                type="text"
                required
                className={`input-field ${
                  errors.username ? "border-red-500" : ""
                }`}
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username}</p>
              )}
            </div>
            <div>
              <input
                name="email"
                type="email"
                required
                className={`input-field ${
                  errors.email ? "border-red-500" : ""
                }`}
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <input
                name="password"
                type="password"
                required
                className={`input-field ${
                  errors.password ? "border-red-500" : ""
                }`}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>
            <div>
              <input
                name="confirmPassword"
                type="password"
                required
                className={`input-field ${
                  errors.confirmPassword ? "border-red-500" : ""
                }`}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {errors.general && (
            <div className="text-red-600 text-sm text-center">
              {errors.general}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-blue-600 hover:text-blue-500">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;


























// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../hooks/useAuth.jsx";
// import { authAPI } from "../services/api";

// const Register = () => {
//   const [formData, setFormData] = useState({
//     username: "",
//     email: "",
//     password: "",
//     confirmPassword: "",
//   });
//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);
//   const { login } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setErrors({});

//     if (formData.password !== formData.confirmPassword) {
//       setErrors({ confirmPassword: "Passwords do not match" });
//       setLoading(false);
//       return;
//     }

//     try {
//       const response = await authAPI.register({
//         username: formData.username,
//         email: formData.email,
//         password: formData.password,
//       });
//       login(response.data.user, response.data.token);
//       navigate("/dashboard");
//     } catch (err) {
//       if (err.response?.data?.errors) {
//         const fieldErrors = {};
//         err.response.data.errors.forEach((error) => {
//           fieldErrors[error.path] = error.msg;
//         });
//         setErrors(fieldErrors);
//       } else {
//         setErrors({
//           general: err.response?.data?.message || "Registration failed",
//         });
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//     if (errors[e.target.name]) {
//       setErrors({ ...errors, [e.target.name]: "" });
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-md w-full space-y-8">
//         <div>
//           <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
//             Create your account
//           </h2>
//         </div>
//         <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
//           <div className="space-y-4">
//             <div>
//               <input
//                 name="username"
//                 type="text"
//                 required
//                 className={`w-full px-3 py-2 border ${
//                   errors.username ? "border-red-500" : "border-gray-300"
//                 } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
//                 placeholder="Username"
//                 value={formData.username}
//                 onChange={handleChange}
//               />
//               {errors.username && (
//                 <p className="text-red-500 text-sm mt-1">{errors.username}</p>
//               )}
//             </div>
//             <div>
//               <input
//                 name="email"
//                 type="email"
//                 required
//                 className={`w-full px-3 py-2 border ${
//                   errors.email ? "border-red-500" : "border-gray-300"
//                 } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
//                 placeholder="Email address"
//                 value={formData.email}
//                 onChange={handleChange}
//               />
//               {errors.email && (
//                 <p className="text-red-500 text-sm mt-1">{errors.email}</p>
//               )}
//             </div>
//             <div>
//               <input
//                 name="password"
//                 type="password"
//                 required
//                 className={`w-full px-3 py-2 border ${
//                   errors.password ? "border-red-500" : "border-gray-300"
//                 } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
//                 placeholder="Password"
//                 value={formData.password}
//                 onChange={handleChange}
//               />
//               {errors.password && (
//                 <p className="text-red-500 text-sm mt-1">{errors.password}</p>
//               )}
//             </div>
//             <div>
//               <input
//                 name="confirmPassword"
//                 type="password"
//                 required
//                 className={`w-full px-3 py-2 border ${
//                   errors.confirmPassword ? "border-red-500" : "border-gray-300"
//                 } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
//                 placeholder="Confirm Password"
//                 value={formData.confirmPassword}
//                 onChange={handleChange}
//               />
//               {errors.confirmPassword && (
//                 <p className="text-red-500 text-sm mt-1">
//                   {errors.confirmPassword}
//                 </p>
//               )}
//             </div>
//           </div>

//           {errors.general && (
//             <div className="text-red-600 text-sm text-center">
//               {errors.general}
//             </div>
//           )}

//           <div>
//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
//             >
//               {loading ? "Creating account..." : "Create account"}
//             </button>
//           </div>

//           <div className="text-center">
//             <Link to="/login" className="text-blue-600 hover:text-blue-500">
//               Already have an account? Sign in
//             </Link>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default Register;