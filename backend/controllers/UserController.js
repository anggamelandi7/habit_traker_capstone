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


static async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'email', 'badge'] 
      });

      if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

      res.json(user);
    } catch (err) {
      console.error('GET /users/me error:', err);
      res.status(500).json({ error: 'Gagal mengambil data user' });
    }
  }
}

module.exports = UserController;
