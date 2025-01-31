"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const nodemailer = require("../config/nodemailer");
dotenv.config();

const User = require("../models/user");

exports.signup = (req, res, next) => {
  const pseudo = req.body.pseudo;
  const email = req.body.email;
  const city = req.body.city;
  const country = req.body.country;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const quote = req.body.quote;
  const isAdmin = false;

  User.findOne({ email: email })
    .then((emailFound) => {
      if (emailFound == null) {
        User.findOne({ pseudo: pseudo })
          .then((userNameFound) => {
            if (userNameFound == null) {
              bcrypt.hash(password, 12)
                .then((hashedPw) => {
                  if (password != confirmPassword || password.length < 1) {
                    const error = new Error("Password validation incorrect...");
                    error.statusCode = 401;
                    throw error
                  }else {
                    const user = new User({
                      pseudo: pseudo,
                      email: email,
                      city: city,
                      country: country,
                      password: hashedPw,
                      quote: quote,
                      isAdmin: isAdmin,
                    });
                    return user.save();                
                  }
                })
                .then((result) => {
                  nodemailer.sendEmail(pseudo, email, "http://localhost:3000/activate-account/" + result._id);
                  res.status(201).json({
                    message: "User have been created !",
                    userId: result._id,
                    user: result,
                  });
                })
                .catch((err) => {
                  if (!err.statusCode) err.statusCode = 500;
                  next(err);
                });
            } else {
              res.status(404).json("This pseudo is already used.");
            }
          })
          .catch((err) => {
            if (!err.statusCode) err.statusCode = 500;
            next(err);
          });
      } else {
        res.status(404).json("This email is already used.");
      }
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("Utilisateur non trouvé");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Mot de passe incorrect");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });

};
