import app from './app'
import { connectDB } from './config/database'
import config from './config/env'

await connectDB()
const port = config.PORT

app.listen(port,()=>{
    console.log(`Server is running on ${port}`)
})