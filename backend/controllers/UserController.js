const { User } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class UserController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        username,
        email,
        password: hashedPassword,
      });
      res.status(201).json({
        message: "User registered",
        user: { id: user.id, email: user.email },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user) return res.status(404).json({ error: "Invalid email/password" });

      const match = await bcrypt.compare(password, user.password);

      if (!match) return res.status(401).json({ error: "Invalid email/password" });

      const token = jwt.sign({ id: user.id, email: user.email }, "goodgame", { expiresIn: "1d" });

      res.json({ message: "Login success", token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /users/me
  static async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ["id", "username", "email", "badge", "totalPoints"],
      });

      if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

      res.json(user);
    } catch (err) {
      console.error("GET /users/me error:", err);
      res.status(500).json({ error: "Gagal mengambil data user" });
    }
  }

  // PATCH /users/me  { username }
  static async updateUsername(req, res) {
    try {
      const { username } = req.body || {};
      if (!username || !String(username).trim()) {
        return res.status(400).json({ error: "username wajib diisi" });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

      // Opsional: cek duplikasi username
      const exists = await User.findOne({
        where: { username: String(username).trim() },
      });
      if (exists && exists.id !== user.id) {
        return res.status(409).json({ error: "Username sudah dipakai" });
      }

      user.username = String(username).trim();
      await user.save();

      return res.json({
        message: "Username updated",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          badge: user.badge || null,
          totalPoints: typeof user.totalPoints !== "undefined" ? user.totalPoints : 0,
        },
      });
    } catch (err) {
      console.error("PATCH /users/me error:", err);
      return res.status(500).json({ error: "Gagal memperbarui username" });
    }
  }

  // POST /users/change-password  { currentPassword, newPassword }
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "currentPassword & newPassword wajib" });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: "Password baru minimal 6 karakter" });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

      const ok = await bcrypt.compare(String(currentPassword), user.password || "");
      if (!ok) return res.status(400).json({ error: "Password saat ini salah" });

      const hashed = await bcrypt.hash(String(newPassword), 10);
      user.password = hashed;
      await user.save();

      return res.json({ message: "Password updated" });
    } catch (err) {
      console.error("POST /users/change-password error:", err);
      return res.status(500).json({ error: "Gagal mengganti password" });
    }
  }
}

module.exports = UserController;
