const Filter = require("bad-words");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");

const {generateMessage} = require("./utils/messages");
const {addUser,removeUser,getUser,getusersInRoom} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

let count=0;

io.on("connection", (socket)=>
{
    console.log("New websocket Connection!");
    // socket.emit("message",generateMessage("Welcome!"));
    // socket.broadcast.emit("message",generateMessage("A new User has Joined!"));

    socket.on("join",({username,room},callback)=>
    {
        const {error, user}= addUser({id:socket.id,username, room});
        if(error)
        {
            return callback(error);
        }
        socket.join(user.room);
        socket.emit("message",generateMessage("Admin","Welcome!"));
        socket.broadcast.to(room).emit("message",generateMessage("Admin",`${user.username} has joined!`));
        io.to(user.room).emit("roomData",{
            room:user.room,
            users:getusersInRoom(user.room)
        });
        callback();
        // socket.emit(), io.emit(), socket.broadcast.emit()
        // io.to.emit(), socket.broadcast.emit()
    });
    socket.on("sendMessage", (data,callback)=>
    {
        const user = getUser(socket.id);
        const filter = new Filter();
        if(filter.isProfane(data))
        {
            return callback("Profanity is not allowed!");
        }
        io.to(user.room).emit("message", generateMessage(user.username,data));
        callback("Message Delivered!");
    });

    // socket.emit("countUpdate",count);
    // socket.on("increment",()=>
    // {
    //     count++;
    //     //socket.emit("countUpdate",count);
    //     io.emit("countUpdate",count);
    // });
    socket.on("disconnect",()=>
    {
        const user = removeUser(socket.id);
        if(user)
        {
            io.to(user.room).emit("message", generateMessage("Admin",`${user.username} left`));
            io.to(user.room).emit("roomData",{
                room:user.room,
                users:getusersInRoom(user.room)
            });
        }
    });

    socket.on("sendLocation",(location, callback)=>
    {
        const user = getUser(socket.id);
        io.to(user.room).emit("locationMessage",generateMessage(user.username,`https://google.com/maps?q=${location.latitude},${location.longitude}`));
        callback("Location shared Successfully!");
    });
});

app.get("/", function(req, res)
{
    res.render("index");
});
app.get("/chat",function(req,res)
{
    res.render("chat");
});


server.listen(process.env.PORT|| 3000, function(err)
{
    if(err)
    {
        console.log(err);
    }
    else
    {
        console.log("Server is listening on port: 3000");
    }
});

