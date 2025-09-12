import { config } from 'dotenv';
config({ path: "./.env" });
import express from 'express';
import './connection.js';
import userRouter from './routers/userRouter.js';
import authRouter from './routers/authRouter.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use('/uploads', express.static('uploads'));

app.use('/users', userRouter);

app.get('/', (req, res) => {
    res.send("Hello WORLD!")
})

app.use("/auth", authRouter);


app.listen(process.env.PORT, () => {
    console.log("Server is on!")
})

