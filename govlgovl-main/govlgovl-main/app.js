const tf = require('@tensorflow/tfjs'),
  canvas = require("canvas"),
  faceapi = require("face-api.js");

let express = require("express"),
  http = require("http"),
  path = require("path");


let bodyParser = require("body-parser"),
  cookieParser = require("cookie-parser"),
  static = require("serve-static"),
  ///errorHandler = require("errorhandler"),
  mongoose = require("mongoose"),
  crypto = require("crypto"),
  config = require("./config"),
  database = require("./database/database"),
  route_loader = require("./routes/route_loader"),
  passport = require("passport"),
  flash = require("connect-flash");

  
  const { Canvas, Image, ImageData } = canvas
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
  console.log("ASDfasgadsfasdgdsaf");
  console.log(faceapi.nets)

const port = process.env.PORT || config.sever_port;

let expressErrorHandler = require("express-error-handler");

let expressSession = require("express-session");

let app = express();

app.set("port", process.env.PORT || port);

app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

faceapi.nets.ssdMobilenetv1.loadFromUri('/models');

app.use(
  expressSession({
    secret: "my key",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(cookieParser());

app.use("/public", static(path.join(__dirname, "/public")));

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
console.log("뷰 엔진이 ejs로 설정되었습니다.");

let router = express.Router();
route_loader.init(app, router);

let smile_today = 4;
let smile_total = 14;
let smile = true;

router.route("/").get(function (req, res) {
  let today = Date.now();

  console.log("/ 패스 요청됨.");
  if (!req.user) {
    console.log("사용자 인증 안된 상태임.");
    res.redirect("/login");
    return;
  }
  console.log("user 정보");
  
  res.render("home.ejs", {
    user: req.user 
  });
});

router.route("/result").post(function (req, res) {

  //console.log(req.body.img);
  console.log(parseInt(req.user.updated_at/10000000) === parseInt(Date.now()/10000000));


  if(parseInt(req.user.updated_at/10000000) !== parseInt(Date.now()/10000000))
  req.user.smile_today = 0;

  if(smile)
    req.user.smile_today++; req.user.smile_total++;
  
  req.user.udated_at = Date.now();
  res.render("result.ejs", {
    user: req.user, smile : true, img: req.body.img
  });

});

// 로그인 화면 - login.ejs 템플릿을 이용해 로그인 화면이 보이도록 함
router.route("/login").get(function (req, res) {
  console.log("/login 패스 요청됨.");
  res.render("login.ejs", {
    message: req.flash("loginMessage"),
    user: req.user,
  });
});

// 사용자 인증 - POST로 요청받으면 패스포트를 이용해 인증함
// 성공 시 /profile로 리다이렉트, 실패 시 /login으로 리다이렉트함
// 인증 실패 시 검증 콜백에서 설정한 플래시 메시지가 응답 페이지에 전달되도록 함
router.route("/login").post(
  passport.authenticate("local-login", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

// 회원가입 화면 - signup.ejs 템플릿을 이용해 회원가입 화면이 보이도록 함
router.route("/signup").get(function (req, res) {
  console.log("/signup 패스 요청됨.");
  res.render("signup.ejs", {
    message: req.flash("signupMessage"),
    user: req.user,
  });
});

// 회원가입 - POST로 요청받으면 패스포트를 이용해 회원가입 유도함
// 인증 확인 후, 성공 시 /profile 리다이렉트, 실패 시 /signup으로 리다이렉트함
// 인증 실패 시 검증 콜백에서 설정한 플래시 메시지가 응답 페이지에 전달되도록 함
router.route("/signup").post(
  passport.authenticate("local-signup", {
    successRedirect: "/profile",
    failureRedirect: "/signup",
    failureFlash: true,
  })
);



// 로그아웃 - 로그아웃 요청 시 req.logout() 호출함
router.route("/logout").get(function (req, res) {
  console.log("/logout 패스 요청됨.");

  req.logout();
  res.redirect("/");
});

//===== Passport Strategy 설정 =====//

let LocalStrategy = require("passport-local").Strategy;

passport.deserializeUser((user, done) => {
  console.log("deserializeUser() 호출됨.");
  console.dir(user); // 매개변수 user는 serializeUser의 done의 인자 user를 받은 것
  done(null, user); // 여기의 user가 req.user가 됨
});

// 사용자 인증 성공 시 호출
// 사용자 정보를 이용해 세션을 만듦
// 로그인 이후에 들어오는 요청은 deserializeUser 메소드 안에서 이 세션을 확인할 수 있음
passport.serializeUser((user, done) => {
  console.log("serializeUser() 호출됨.");
  console.dir(user);

  done(null, user); // 이 인증 콜백에서 넘겨주는 user 객체의 정보를 이용해 세션 생성
});
//패스포트 로그인 설정
passport.use(
  "local-login",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: true,
      passReqToCallback: true, // 이 옵션을 설정하면 아래 콜백 함수의 첫번째 파라미터로 req 객체 전달됨
    },
    (req, email, password, done) => {
      console.log("passport의 local-login 호출됨 : " + email + ", " + password);

      let database = app.get("database");
      database.UserModel.findOne({ email: email }, function (err, user) {
        if (err) {
          return done(err);
        }

        // 등록된 사용자가 없는 경우
        if (!user) {
          console.log("계정이 일치하지 않음.");
          return done(
            null,
            false,
            req.flash("loginMessage", "등록된 계정이 없습니다.")
          ); // 검증 콜백에서 두 번째 파라미터의 값을 false로 하여 인증 실패한 것으로 처리
        }

        // 비밀번호 비교하여 맞지 않는 경우
        let authenticated = user.authenticate(
          password,
          user._doc.salt,
          user._doc.hashed_password
        );
        if (!authenticated) {
          console.log("비밀번호 일치하지 않음.");
          return done(
            null,
            false,
            req.flash("loginMessage", "비밀번호가 일치하지 않습니다.")
          ); // 검증 콜백에서 두 번째 파라미터의 값을 false로 하여 인증 실패한 것으로 처리
        }

        // 정상인 경우
        console.log("계정과 비밀번호가 일치함.");
        return done(null, user); // 검증 콜백에서 두 번째 파라미터의 값을 user 객체로 넣어 인증 성공한 것으로 처리
      });
    }
  )
);

// 패스포트 회원가입 설정
passport.use(
  "local-signup",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true, // 이 옵션을 설정하면 아래 콜백 함수의 첫번째 파라미터로 req 객체 전달됨
    },
    function (req, email, password, done) {
      // 요청 파라미터 중 name 파라미터 확인
      let paramName = req.body.name || req.query.name;

      console.log(
        "passport의 local-signup 호출됨 : " +
          email +
          ", " +
          password +
          ", " +
          paramName
      );

      // findOne 메소드가 blocking되지 않도록 하고 싶은 경우, async 방식으로 변경
      process.nextTick(function () {
        let database = app.get("database");
        database.UserModel.findOne({ email: email }, function (err, user) {
          // 에러 발생 시
          if (err) {
            return done(err);
          }

          // 기존에 사용자 정보가 있는 경우
          if (user) {
            console.log("기존에 계정이 있음.");
            return done(
              null,
              false,
              req.flash("signupMessage", "계정이 이미 있습니다.")
            ); // 검증 콜백에서 두 번째 파라미터의 값을 false로 하여 인증 실패한 것으로 처리
          } else {
            // 모델 인스턴스 객체 만들어 저장
            let user = new database.UserModel({
              email: email,
              password: password,
              name: paramName,
            });
            user.save(function (err) {
              if (err) {
                throw err;
              }

              console.log("사용자 데이터 추가함.");
              return done(null, user); // 검증 콜백에서 두 번째 파라미터의 값을 user 객체로 넣어 인증 성공한 것으로 처리
            });
          }
        });
      });
    }
  )
);

// 사용자 인증 이후 사용자 요청 시마다 호출
// user -> 사용자 인증 성공 시 serializeUser 메소드를 이용해 만들었던 세션 정보가 파라미터로 넘어온 것임

let errorHandler = expressErrorHandler({
  static: {
    404: "./public/404.html",
  },
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

http.createServer(app).listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);

  database.init(app, config);
});
