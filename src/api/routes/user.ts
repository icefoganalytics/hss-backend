import { UserRepository } from './../repository/oracle/UserRepository';
import express, { Request, Response } from "express";
import { EnsureAuthenticated } from "./auth"
import { AppUser, Team } from "../models/user";
import { param } from "express-validator";
var RateLimit = require('express-rate-limit');
const userRepo = new UserRepository();

export const userRouter = express.Router();
userRouter.use(RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 5000
}));

userRouter.get("/", EnsureAuthenticated, async (req: Request, res: Response) => {
    try {
        var appUser: AppUser;
        appUser = req.user;

        // teams could be pulled from the database
        appUser.teams = new Array<Team>();
        appUser.teams[0] = { id: "1234", name: "Team one", role: "Member" }
        appUser.teams[1] = { id: "1234", name: "Team two", role: "Admin" }

        res.send(appUser);
    } catch(e) {
        console.log(e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

userRouter.get("/roles/options", EnsureAuthenticated, async (req: Request, res: Response) => {
    try {
        const email = req.user?.oid_user?.email;
        const userName = req.user?.oid_user?.name;

        res.send({
            data: {email: email, userName: userName}
        });
    } catch(e) {
        console.log(e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});