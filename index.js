const express = require('express');
const { MongoClient, ServerApiVersion, Db, ObjectId } = require('mongodb');
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser")
const dotenv = require("dotenv");
const { sign, verify } = require('jsonwebtoken');
dotenv.config() // config

// port 
const Port = process.env.PORT || 5000; 

// cross origin 
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true,                  
}))

// json parser 
app.use(express.json());

// url unicodded 
app.use(express.urlencoded({extended:true})) ;

// cookie parser 
app.use(cookieParser(process.env.SECRETKEY_KEY_F_COOKIE))



// mongodb uri 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@nahidprogramingworld.6llsn4g.mongodb.net/?retryWrites=true&w=majority`;

// uri connetion setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

/*====================================================
        All Database oparetion start from here      
====================================================*/ 
 
async function run() {
  try { 
     // database 
     const db = client.db("NahidHomeServices") 
     // collections 
     const categories =  db.collection("category");
     const ClientRiviews =  db.collection("ClientRiviews");
     const services =  db.collection("Services");
     const Bookings =  db.collection("Bookings");
  
  
     // middlewares 
     // const cheack user 

    //   
     const checkUser =  (req,res,next)=>{
     const token = req.signedCookies[process.env.COOKIE_NAME];
     if(token){
       const data =  verify(token,process.env.SECRETKEY_KEY_F_JWT);
       if(data.uid){
        req.uid = data.uid;
         next()

       }
       else{
        res.status(401).send('User not found');
       }
     }
     else{
      res.status(403).send('forbiden request')
     }
     }

     // middlewares end


    // user log in 
    app.post("/api/v1/login",async (req,res)=>{
      try{
   
       const token = sign({uid: req.body.uid},process.env.SECRETKEY_KEY_F_JWT , {expiresIn:process.env.EXPIRE_TIME})
       res.cookie(process.env.COOKIE_NAME,token,{
        maxAge:process.env.EXPIRE_TIME,
        httpOnly:true,
        signed:true,
        secure:true,
        sameSite:'none'
       }).send({success:true});
       
      }
      catch(err){
      
       res.status(500).send('There is server side error')
      }
     }) 

     // user log out
   app.delete("/api/v1/logout",async (req,res)=>{ 
      try{
      res.clearCookie(process.env.COOKIE_NAME).send({success:true});
      }
      catch(err){
       res.status(500).send('There is server side error')
      }
     })


    // get catagory datas 
    app.get("/api/v1/categories",async (req,res)=>{
       try{
        const result = await categories.find({}).toArray()
        res.status(200).send(result);
       }
       catch(err){
       
        res.status(500).send('There is server side error')
       }
      })  


       app.get("/api/v1/client-riviews",async (req,res)=>{
       try{
        const result = await ClientRiviews.find({}).toArray()
        res.status(200).send(result);
       }
       catch(err){ 
        res.status(500).send('There is server side error')
       }
      }) 


      // add service route 
      app.post("/api/v1/add-service",checkUser , async (req,res)=>{
        try{
          const result = await services.insertOne({...req.body , createAt : new Date()});
          res.status(200).send(result);
         }
         catch(err){ 
          res.status(500).send('There is server side error')
         }
      }) 

      // Update service route 
      app.put("/api/v1/update-service/:upSid", checkUser , async (req,res)=>{
        try{
          const document = req.body;
          const result = await services.updateOne({_id: new ObjectId(req.params.upSid)},{$set:document});
          res.status(200).send(result);
         }
         catch(err){  
       
          res.status(500).send('There is server side error')
         }
      })

      // popular services 
      app.get("/api/v1/popular-service" ,async (req,res)=>{
        try{
          const result = await services.find({}).sort({'rating':"desc" , 'createAt' : "desc"}).limit(6).toArray()
          res.status(200).send(result);
         }
         catch(err){ 
          res.status(500).send('There is server side error')
         }
        })

        //get all services 

        app.get("/api/v1/services",async (req,res)=>{
          try{
           const limit = req.query.limit || 9 
           const page = req.query.page || 1; 
           const query = { }
           let sort = {
            'createAt' : "desc"
           }
           if(req.query.category){
             query.category = req.query.category;
           }
           if(req.query.sortfield){
            sort = {[req.query.sortfield]: req.query.order}
           }
           if(req.query.search){
            query.servicename = { $regex: new RegExp(req.query.search, "i")}
           }
           const count = await services.countDocuments(query);
           const result = await services.find(query).sort(sort).skip((page-1) * limit).limit(limit).toArray()
           res.status(200).send({data:result , totalresult : count});
           
          }

          catch(err){
           res.status(500).send('There is server side error')
          }
         }) 

        //get  services details
        app.get("/api/v1/service-details/:sid", checkUser , async (req,res)=>{
          try{
       
            const result = await services.findOne({_id : new ObjectId (req.params.sid)})
            res.status(200).send(result);
           }
           catch(err){  
            res.status(500).send('There is server  side error')
           }
          })
        //get  related  services  
        app.get("/api/v1/related-services/:relid",checkUser  ,async (req,res)=>{
          try{
            const result = await services.find({ _id: {$ne: new ObjectId(req.params.relid)},category:req.query.category}).sort({'rating':"desc" , 'createAt' : "desc"}).limit(3).toArray()

            res.status(200).send(result);
           }
           catch(err){ 
            res.status(500).send('There is server side error')
           }
          })   
         
         //get other  services  
          app.get("/api/v1/other-services/:relid" , checkUser ,async (req,res)=>{
          
           try{
            const result = await services.find({ _id: {$ne: new ObjectId(req.params.relid)},'provider.uid':req.query.uid}).sort({'rating':"desc" , 'createAt' : "desc"}).limit(3).toArray()
            
            res.status(200).send(result);
           }
           catch(err){ 
            res.status(500).send('There is server side error')
           }
          })

         // set Booking 
    
         app.post("/api/v1/booking/:sid", checkUser ,async (req,res)=>{
          try{
            const result = await Bookings.insertOne({...req.body , status : 'pending' , serviceid  : new ObjectId(req.params.sid)});
            res.status(200).send(result);
           }
           catch(err){ 
          
            res.status(500).send('There is server side error')
           }
         })

         // get my services 
         app.get("/api/v1/my-services", checkUser ,async (req,res)=>{
          try{
            const result = await services.find({'provider.uid':req.uid}).toArray()
            res.status(200).send(result);
           }
           catch(err){ 
          
            res.status(500).send('There is server side error')
           }
         })

         // delete service data 
         app.delete("/api/v1/my-service/:sid", checkUser ,async (req,res)=>{
          try{
            const bokings = await Bookings.deleteOne({serviceid: new ObjectId(req.params.sid)})
            const result = await services.deleteOne({_id: new ObjectId(req.params.sid)})
            res.status(200).send(result);
           }
           catch(err){ 
            res.status(500).send('There is server side error')
           }
         })
         
         // my booking service data 
         app.get("/api/v1/my-bookings",checkUser ,async (req,res)=>{
          try{
            const result = await Bookings.aggregate([
              { $lookup: { from: "Services", localField: "serviceid", foreignField: "_id", as: "servicedata" } },
               { $unwind: "$servicedata" }, 
               { $match: { "consumer.uid": req.uid } }

            ]).toArray()
            res.send(result)
           }
           catch(err){ 
            res.status(500).send('There is server side error')
           }
         })    

         // my orders service data 

         app.get("/api/v1/my-orders", checkUser ,async (req,res)=>{
          try{
            const result = await Bookings.aggregate([
              { $lookup: { from: "Services", localField: "serviceid", foreignField: "_id", as: "servicedata" } },
               { $unwind: "$servicedata" }, 
               { $match: { "provider.uid": req.uid } }

            ]).toArray()
            res.send(result)
           }
           catch(err){ 
            res.status(500).send('There is server side error')
           }
         })

         app.patch("/api/v1/booking-status/:sid",checkUser ,async (req,res)=>{
          try{
            const result = Bookings.updateOne({"_id": new ObjectId(req.params.sid)} , {$set:{'status':req.body.status}})
            res.status(200).send(result);
           }
           catch(err){ 
            res.status(500).send('There is server side error')
           }
          })
   
        // confirm connetion
        console.log("MongoDb Server Connected....")
        } finally { }
      }  

      run().catch((err)=>{
        console.log(err)
        throw Error("There is a server side")
      });  

      app.get("/",(req,res)=>{
             res.send("App is running....")                
      })
/*====================================================
        All Database oparetion  end here       
====================================================*/ 
  
// defualt error handeler  
app.use((err,req,res,next)=>{
  res.status(500).send(err?.message)
})

// app listener
app.listen(Port,()=>{
   console.log(`Server is running port ${Port}`)                 
})
