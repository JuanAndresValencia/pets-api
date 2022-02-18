require('dotenv').config()
const { ApolloServer, gql, UserInputError } = require("apollo-server");
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
const Pet = require("./models/pet");
const User = require('./models/user');

const JWT_SECRET = 'secret'

const MONGODB_URI =
  `mongodb+srv://${process.env.MONGODB_PASS}:graphql@cluster0.upzqc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to mongodb");
  })
  .catch((error) => {
    console.log("Error to connect");
  });

const typeDefs = gql`
  type Pet {
    animal: String
    name: String
    id: ID!
  }

  type User {
    username: String!
    friends: [User!]!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    me: User
    allPets: [Pet!]!
    petsLength: Int!
    findPet(name: String!): Pet
    findPetById(id: String!): Pet
    allUsers: [User!]!
  }

  type Mutation {
    addPet(
      animal: String!
      name: String!
    ): Pet

    editPet(
      id: ID!
      name: String!
    ): Pet

    createUser(
      username: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token
  }
`;

const resolvers = {
  Query: {
    allPets: async() => {
      return await Pet.find({})
    },
    petsLength: () => {
      return Pet.collection.countDocuments()
    },
    findPet: async(root, args) => {
      return await Pet.findOne({
        name: args.name
      })
    },
    findPetById: async(root, args) => {
      return await Pet.findById(args.id)
    },
    allUsers: async(root, args) => {
      return await User.find({})
    },
    me: (root, args, context) => {
      return context.currentUser
    }
  },
  Mutation: {
    addPet: async(root, args, context) => {
      const pet = new Pet({
        ...args
      })
      
      if (context.currentUser){
        try {
          await pet.save()
        } catch(error) {
          throw new userInputError(error, {
            invalidArgs: args
          })
        }
      } else {
        throw new Error('No user logged in')
      }

      return pet
    },
    editPet: async(root, args) => {
      const pet = await Pet.findById(args.id)
      pet.name = args.name
      await pet.save()
      return pet
    },
    createUser: (root, args) => {
      const user = new User({
        ...args
      })

      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args
          })
        })
    },
    login: async(root, args) => {
      const user = await User.findOne({
        username: args.username
      })

      if (!user || args.password != 'secret') {
        throw new UserInputError('wrong credentials')
      }

      const userForToken = {
        username: user.username,
        id: user._id
      }

      return {
        value: jwt.sign(userForToken, JWT_SECRET)
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), JWT_SECRET
      )
      const currentUser = await User.findById(decodedToken.id)
      return {
        currentUser
      }
    }
  }
});

server.listen().then(({ url }) => {
  console.log(`Server on port ${url}`);
});
