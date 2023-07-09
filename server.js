const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const mysql = require('mysql2');

// Create a MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cussons',
  });


// Define a GraphQL schema
const schema = buildSchema(`
type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  user(id: ID!): User
}

type Mutation {
  createUser(name: String!, email: String!): User
}
`);


// Define resolvers
const root = {
    user: ({ id }) => {
      // Retrieve a user from the database by ID
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
    createUser: ({ name, email }) => {
      // Insert a new user into the database
      const user = { name, email };
      return new Promise((resolve, reject) => {
        connection.query('INSERT INTO users SET ?', user, (error, results) => {
          if (error) {
            reject(error);
          } else {
            user.id = results.insertId;
            resolve(user);
          }
        });
      });
    },
  };


  // Create an Express app
const app = express();

// Define a GraphQL endpoint
app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true, // Enable GraphiQL interface for testing
  })
);

// Start the server
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000/graphql');
});
