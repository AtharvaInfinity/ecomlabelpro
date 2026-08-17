import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import {uploadRoutes} from './routes/upload.js'
import {processRoutes} from './routes/process.js'
import {downloadRoutes} from './routes/download.js'
import {flipkartProcessRoutes} from './routes/flipkart-process.js'
import {meeshoProcessRoutes} from './routes/meesho-process.js'
import {mergePdfRoutes} from './routes/merge-pdf.js'
import {blobUploadRoutes} from './routes/blob-upload.js'
const app=Fastify({logger:true})
await app.register(cors,{origin:true})
await app.register(multipart,{limits:{fileSize:50*1024*1024,files:20}})
app.get('/api/health',async()=>({status:'ok',service:'ecom-label-pro-api'}))
await uploadRoutes(app);await blobUploadRoutes(app);await processRoutes(app);await flipkartProcessRoutes(app);await meeshoProcessRoutes(app);await mergePdfRoutes(app);await downloadRoutes(app)
try{await app.listen({port:Number(process.env.PORT||4000),host:process.env.HOST||'0.0.0.0'})}catch(e){app.log.error(e);process.exit(1)}