import app from './app.js'
import { connectDB } from './config/database.js'
import config from './config/env.js'

await connectDB()
const port = config.PORT

app.listen(port,()=>{
    console.log(`Server is running on ${port}`)
})