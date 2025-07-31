const { User } = require ("../models");
const bcrypt = require ("bcryptjs");
const jwt = require ("jsonwebtoken");

class UserController {
    static async register (req, res) {
        try {
            const {username, email, password} = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                username,
                email,
                password: hashedPassword,
            });

            res.status(201).json({ 
                message: "User registered", 
                user: { id:user.id, email: user.email } 
            });
            } catch (err){
                res.status(500).json({ error: err.message});            
        }
    }

    static async login (req, res) {
        try{
            const {email, password} = req.body;
            const user = await User.findOne({ where: {email}});

            if (!user) return res.status(404).json({ error: "Invalid email/password"});

            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: "Invalid email/password" });

            const token = jwt.sign({ id: user.id, email: user.email}, "secret_key");

            res.json({ message: "Login succes", token });
        } catch (err) {
            res.status(500).json({ error: err.mesage});
        }
    }
 }

    module.exports = UserController;