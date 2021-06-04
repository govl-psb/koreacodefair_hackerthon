let mongoose = require("mongoose");

let database = {};

database.init = (app, config) => {
  console.log("init() 호출됨.");

  connect(app, config);
};

function connect(app, config) {
  console.log("connect() 호출됨");

  let databaseUrl = process.env.DATABASE_URL || config.db_url;

  console.log("데이터베이스 연결을 시도합니다.");
  mongoose.set("useCreateIndex", true);
  mongoose.Promise = global.Promise;
  mongoose.connect(databaseUrl, { useNewUrlParser: true });
  database = mongoose.connection;

  database.on(
    "error",
    console.error.bind(console, "mongoose connection error.")
  );
  database.on("open", function () {
    console.log("데이터베이스에 연결되었습니다. : " + databaseUrl);

    createSchema(app, config);

    database.on("disconnected", () => {
      console.log("연결이 끊어 졌습니다. 5초 후 다시 연결합니다.");
      setInterval(connectDB, 5000);
    });
  });
}

function createSchema(app, config) {
  let schemaLen = config.db_schemas.length;
  console.log("설정에 정의된 스키마의 수 : %d", schemaLen);

  for (let i = 0; i < schemaLen; i++) {
    let curItem = config.db_schemas[i];

    let curSchema = require(curItem.file).createSchema(mongoose);
    console.log("%s 모듈을 불러들인 후 스키마 정의함", curItem.collection);

    let curModel = mongoose.model(curItem.collection, curSchema);
    console.log("%s 컬렉션을 위해 모델 정의함.", curItem.collection);

    database[curItem.schemaName] = curSchema;
    database[curItem.modelName] = curModel;
    console.log(
      "스키마 이름[%s], 모델 이름[%s]이 datbase 객체 속성으로 추가됨.",
      curItem.schemaName,
      curItem.modelName
    );
  }

  //user.init(database, database["UserSchema"], database["UserModel"]);
  app.set("database", database);
  console.log("database 객체가 app 객체의 속성으로 추가됨");
}

module.exports = database;
