
export class AppConfig {

  public static typeOrmOption4RMRKDB = {

    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'postgres',
    synchronize: false,
    logging: false,
  };


  public static initilize() {

    console.log(AppConfig);
  }

}
