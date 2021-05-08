import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import cors from 'cors';
import knex from 'knex';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const db = knex({
	client: 'pg',
	connection: {
	    connectionString: process.env.DATABASE_URL,
	    ssl:true,
	}
});

// db.select('*').from('users').then(data=>{
// 	console.log(data);
// });

const app = express();

app.use(express.json());
app.use(cors());

app.get('/',(req,res)=>{ 
	res.send('database');
})

app.post('/signin', (req,res)=>{
	const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json('incorrect form submission');
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req,res)=>{
	const {email, name, password} = req.body;
	if(!email || !name || !password){
		return res.status(400).json('incorrect form submission');
	}
	const hash = bcrypt.hashSync(password);
		db.transaction(trx => {
			trx.insert({
				hash: hash,
				email: email
			})
			.into('login')
			.returning('email')
			.then(loginEmail=>{
				return trx('users')
					.returning('*')
					.insert({
						email:loginEmail[0],
						name:name,
						joined: new Date()
					})
					.then(user=>{
						res.json(user[0]);
					})
				})
			.then(trx.commit)
			.catch(trx.rollback)
		})
		.catch(err=>res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res)=>{
	const{ id } = req.params;
	// let found= false;
	db.select('*').from('users').where({id:id})
	.then(user=>{
		if(user.length){
			res.json(user[0]);
		} else{
			res.status(400).json('Not found')
		}		
	})
	.catch(err=>res.status(400).json('error getting user'))
	// if(!found){
	// 	res.status(400).json('not found');
	// }
})

app.put('/image',(req,res)=>{
	const{ id } = req.body;
	db('users').where('id', '=', id)
	.increment('entries', 1)
	.returning('entries')
	.then(entries=>{
		res.json(entries[0]);
	})
	.catch(err=>res.status(400).json('unable to get entries'))
})

app.listen(process.env.PORT || 3000, ()=>{
	console.log(`app is running on port ${process.env.PORT}`);
})

/*
/ --> res = this is working
/SignIn --> POST = success/fail
/register --> POST = user
/profile/:userId --> GET = user
/image --> PUT --> updated user

*/