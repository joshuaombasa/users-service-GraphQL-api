const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const { execute, subscribe } = require('graphql');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { PubSub } = require('graphql-subscriptions');
const mysql = require('mysql2');

const pubsub = new PubSub();

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'cussons',
});

const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    createUser(name: String!, email: String!): User
    deleteUser(id: ID!): String
  }

  type Subscription {
    userAdded: User
  }
`);

const root = {
  user: ({ id }) => {
    return new Promise((resolve, reject) => {
      connection.query('SELECT * FROM users WHERE id = ?', [id], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results[0]);
        }
      });
    });
  },
  users: () => {
    return new Promise((resolve, reject) => {
      connection.query('SELECT * FROM users', (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  },
  createUser: ({ name, email }) => {
    const user = { name, email };
    return new Promise((resolve, reject) => {
      connection.query('INSERT INTO users SET ?', user, (error, results) => {
        if (error) {
          reject(error);
        } else {
          user.id = results.insertId;
          pubsub.publish('userAdded', { userAdded: user });
          resolve(user);
        }
      });
    });
  },
  deleteUser: ({ id }) => {
    return new Promise((resolve, reject) => {
      connection.query('DELETE FROM users WHERE id = ?', [id], (error, results) => {
        if (error) {
          reject(error);
        } else {
          if (results.affectedRows > 0) {
            resolve(`User with ID ${id} deleted successfully`);
          } else {
            reject(new Error(`User with ID ${id} not found`));
          }
        }
      });
    });
  },
};

const app = express();

// app.use(
//   '/graphql',
//   graphqlHTTP({
//     schema: schema,
//     rootValue: root,
//     graphiql: true,
//   })
// );

const server = createServer(app);
server.listen(3000, () => {
  console.log('Server started on http://localhost:3000/graphql');
});

const subscriptionServer = SubscriptionServer.create(
  {
    execute,
    subscribe,
    schema,
  },
  {
    server: server,
    path: '/subscriptions',
  },
  (ws, req) => console.log('WebSocket connected')
);
