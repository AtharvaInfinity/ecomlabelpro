import type {FastifyInstance} from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
const dir=path.resolve(process.cwd(),'data/outputs')
export async function downloadRoutes(app:FastifyInstance){
 await fs.mkdir(dir,{recursive:true})
 app.get('/api/pdf/download/:id',async(req,reply)=>{
  try{const id=path.basename((req.params as {id:string}).id);const buf=await fs.readFile(path.join(dir,id));reply.header('Content-Type','application/pdf');const requestedName = typeof (req.query as {name?: string})?.name === 'string'
    ? (req.query as {name?: string}).name
    : 'processed-pdf.pdf'
   const safeName = requestedName?.toLowerCase().endsWith('.pdf') ? requestedName : `${requestedName || 'processed-pdf'}.pdf`
   reply.header('Content-Disposition', `attachment; filename="${safeName.replace(/["\\]/g, '')}"`)
   return reply.send(buf)}
  catch{return reply.status(404).send({message:'Output PDF not found.'})}
 })
}