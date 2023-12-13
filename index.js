
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;


app.get('/', (req, res) => {
  res.send('Product server is running');
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});


// bd-job-hunter
// oxHtCo2MTarPlOgH
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.lu7tyzl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const database = client.db('bd-job-hunter')
    const jobs = database.collection('jobs')
    const userProfile = database.collection('userProfile')
    const application = database.collection('application')

    // verify token
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // verify admin or not


    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userProfile.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }


    const verifyHring = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { emails: email };
      const user = await userProfile.findOne(query);
      const isVolunteer = user?.role === 'hiring';
      if (!isVolunteer) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    app.post("/newJob", verifyToken, async (req, res) => {
      try {
        const products = req.body;
        const result = await jobs.insertOne(products);
        res.send(result);
      } catch (error) {
        console.error('Error adding job:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.post("/application", async (req, res) => {
      try {
        const applications = req.body;
        const result = await application.insertOne(applications);
        res.send(result);
      } catch (error) {
        console.error('Error adding job:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.get("/application/:email", verifyToken, verifyHring, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await application.find(query).toArray()
      res.send(result)
    })

    app.get("/my-application/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await application.find(query).toArray()
      res.send(result)
    })

    app.get("/usere/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userProfile.find(query).toArray()
      res.send(result)
    })

    app.get("/jobs-hiring/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await jobs.find(query).toArray();
      res.send(result)
    })

    app.post("/userProfile", verifyToken, async (req, res) => {
      try {
        const users = req.body;
        const result = await userProfile.insertOne(users);
        res.send(result);
      } catch (error) {
        console.error('Error adding job:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await userProfile.find().toArray();
      res.send(result)
    })

    app.patch("/users/:email", async (req, res) => {
      try {
        const id = req.params.email;
        const filter = { emails: (id) };
        const options = { upsert: true };
        const { skills } = req.body;

        // Check if skills is not null or undefined before updating
        if (skills != null) {
          const userUpdate = {
            $set: { skills }  // Correct usage of $set
          };
          const result = await userProfile.updateOne(filter, userUpdate, options);
          res.send({ result });
        } else {
          res.status(400).send("Bad Request: Skills array is null or undefined");
        }
      } catch (error) {
        console.error("Error updating user skills:", error);
        res.status(500).send("Internal Server Error");
      }
    });


    app.get('/admin-stats', verifyToken, async (req, res) => {
      const totalUser = await userProfile.estimatedDocumentCount();
      const totalApplicant = await application.estimatedDocumentCount();
      const totalJobs = await jobs.estimatedDocumentCount();
      res.send({ totalApplicant, totalJobs, totalUser })
    })



    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobs.findOne(query);
      res.send(result)
    })

    app.get("/jobs", async (req, res) => {
      const result = await jobs.find().toArray();
      res.send(result)
    })


    // check if data exist 

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { emails: user.email };
      const existUser = await userProfile.findOne(query);
      if (existUser) {
        return res.send({ message: 'userExist', InsertedId: null });
      }
      const result = await userProfile.insertOne(user)
      res.send(result)
    })

    //set jwt seceurity token

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token })
    })

    //geting the admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { emails: email };
      const user = await userProfile.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.get('/users/hiring/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { emails: email };
      const user = await userProfile.findOne(query);
      let hiring = false;
      if (user) {
        hiring = user?.role === 'hiring';
      }
      res.send({ hiring });
    })

    app.patch('/job-status/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedService = req.body;
      const user = {
        $set: {
          status: updatedService.status,
        }
      }
      const result = await jobs.updateOne(filter, user, options);
      res.send(result)
    })

    app.patch('/application/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedService = req.body;
      const user = {
        $set: {
          status: updatedService.status,
        }
      }
      const result = await application.updateOne(filter, user, options);
      res.send(result)
    })

    app.patch('/user-status/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedService = req.body;
      const user = {
        $set: {
          role: updatedService.role,
        }
      }
      const result = await userProfile.updateOne(filter, user, options);
      res.send(result)
    })

    app.delete("/jobs/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobs.deleteOne(query);
      res.send(result)
    })

    app.delete("/user/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userProfile.deleteOne(query);
      res.send(result)
    })

    app.delete("/application/:id", verifyToken, verifyHring, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await application.deleteOne(query);
      res.send(result)
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);
