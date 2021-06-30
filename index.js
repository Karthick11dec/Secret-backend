const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const router = express();
router.use(express.json());
router.use(cors());
dotenv.config();

const mongoClient = mongodb.MongoClient;
const objectId = mongodb.ObjectID;
// const DB_URL = "mongodb://127.0.0.1:27017";
const DB_URL = process.env.DBURL || "mongodb://127.0.0.1:27017";
const database = "secretMessage";
const Docs = "data";

const PORT = process.env.PORT || 5000;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    }
})

router.get('/', async (req, res) => {
    res.send("secret message service");
})

router.post('/create-message', async (req, res) => {
    try {
        const client = await mongoClient.connect(DB_URL);
        const db = client.db(database);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password, salt);
        const data = {
            password: hash,
            key: req.body.randomKey,
            deletor: req.body.password,
            message: req.body.message,
            mail: req.body.targetMail
        }
        await db.collection(Docs).insertOne(data);
        const result = await db.collection(Docs).findOne({ key: data.key });
        // console.log(result);
    //     //for receiver
        let receiver = transporter.sendMail({
            from: process.env.EMAIL,
            to: req.body.targetMail,
            subject: "S*CR*T M*SSAG*",
            html: `<p>Hi this is ${process.env.EMAIL},<br /><br />
        I have a SECRET MESSAGE for you <a href='${req.body.targetURL}?rs=${result._id}' target='_blank'>Click here.</a><br />
        <p>Note : Don't share with Anyone...</p>
     </p>`
        });

        //for sender
       let sender = transporter.sendMail({
            from: process.env.EMAIL,
            to: process.env.EMAIL,
            subject: "S*CR*T M*SSAG* ACK*",
            html: `<p>This is from your <b>Secret message service</b> my Dear admin.<p>
            <p>
                <span>You only have the access to delete the specific message
                    that you have already sent to <b>${result.mail}</b>.PFB,
                </span>
            </p>
            <p>
                <div>Note : Copy and past it on your admin panel to delete the message.</div>
                <br></br>
                <div><b>Secret key :</b><span> ${result.key}</span></div>
                <div><b>Passcode :</b><span> ${result.deletor}</span></div>
            </p>`
        });
        // console.log(result);
        res.json({ message: "Ack of this message has been sent to your mail", sender , receiver });
        client.close();
    } catch (error) {
        console.log(error);
        res.json({ message: "Entered mail is not exist.", error });
    }
})

router.get('/message-by-id/:id', async (req, res) => {
    try {
        const client = await mongoClient.connect(DB_URL);
        const db = client.db(database);
        const result = await db.collection(Docs)
            .find({ _id: objectId(req.params.id) })
            .project({ password: 0, _id: 0, key: 0 }).toArray();
        res.status(200).json({ message: "message have been fetched successfully.", result });
        client.close();
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

router.delete('/delete-message', async (req, res) => {
    try {
        const client = await mongoClient.connect(DB_URL);
        const db = client.db(database);
        const secret = await db.collection(Docs).findOne({ key: req.body.secretKey });
        if (secret) {
            const compare = await bcrypt.compare(req.body.password, secret.password);
            if (compare) {
                await db.collection(Docs).findOneAndDelete({ key: req.body.secretKey });
                res.status(200).json({ message: 'message has been deleted successfully.' });
            } else {
                res.status(401).json({ message: "incorrect password!" });
            }
        } else {
            res.status(404).json({ message: "secret key not found!!!" });
        }
        client.close();
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})


router.listen(PORT, () => console.log(`::: Server is UP and running successfully ::: ${PORT}`))