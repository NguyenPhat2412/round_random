import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, Spin, Alert } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import "../styles/login.css";
import { userAPI } from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);

    try {
      const response = await userAPI.login({ email, password });

      if (response.data.success) {
        setSuccess(response.data.message);
        // Save user info and token to localStorage
        localStorage.setItem("user", JSON.stringify(response.data.user));
        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
        }
        // Redirect after 1.5 seconds
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message || "Lỗi đăng nhập. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-stars"></div>
      </div>

      <div className="login-content">
        <Card className="login-card">
          <div className="login-header">
            <h1>Vòng Quay May Mắn</h1>
            <p>Đăng nhập để tiếp tục</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginBottom: "16px" }}
                closable
                onClose={() => setError("")}
              />
            )}

            {success && (
              <Alert
                message={success}
                type="success"
                showIcon
                style={{ marginBottom: "16px" }}
                closable
                onClose={() => setSuccess("")}
              />
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email của bạn"
                prefix={<MailOutlined />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="large"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <Input.Password
                id="password"
                placeholder="Nhập mật khẩu"
                prefix={<LockOutlined />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="large"
                disabled={loading}
              />
            </div>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              className="login-button"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="login-info">
            <p>💡 Chỉ tài khoản được cấp quyền mới có thể đăng nhập.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
