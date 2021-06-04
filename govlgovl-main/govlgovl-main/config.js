module.exports = {
  sever_port: 5000,
  db_url:
    "",
  db_schemas: [
    {
      file: "./user_schema",
      collection: "users",
      schemaName: "UserSchema",
      modelName: "UserModel",
    },
  ],
  route_info: [],
};
