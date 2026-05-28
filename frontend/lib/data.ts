export const sampleQueries = [
  {
    label: "Normal login",
    query: "SELECT id, username FROM users WHERE username = 'maria' AND password_hash = '9f86d081884c7d659a2feaa0c55ad015';"
  },
  {
    label: "OR 1=1",
    query: "SELECT * FROM users WHERE id = 1 OR 1=1 --"
  },
  {
    label: "UNION SELECT",
    query: "UNION SELECT NULL, table_name, column_name FROM information_schema.columns;"
  },
  {
    label: "SLEEP",
    query: "SELECT * FROM accounts WHERE id = 5 AND SLEEP(5);"
  },
  {
    label: "DROP TABLE",
    query: "1; DROP TABLE users; --"
  }
];

export const modelMetrics = [
  {
    model: "Random Forest",
    accuracy: 99.7214,
    precision: 99.9552,
    recall: 99.2873,
    f1: 99.6201,
    rocAuc: 0.99959
  },
  {
    model: "XGBoost",
    accuracy: 99.574,
    precision: 99.8204,
    recall: 99.02,
    f1: 99.4186,
    rocAuc: 0.99939
  },
  {
    model: "Hybrid Ensemble",
    accuracy: 99.6559,
    precision: 99.9102,
    recall: 99.1537,
    f1: 99.5305,
    rocAuc: 0.99964
  }
];

export const confusionMatrix = {
  tn: 3856,
  fp: 2,
  fn: 19,
  tp: 2226
};
