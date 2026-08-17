import type {FastifyInstance} from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import {PDFDocument} from 'pdf-lib'
const dir=path.resolve(process.cwd(),'data/uploads')
export async function uploadRoutes(app:FastifyInstance){
 await fs.mkdir(dir,{recursive:true})
 app.post('/api/pdf/upload',async(req,reply)=>{
  try{
   const parts=req.files()
   const out=[]
   for await(const part of parts){
    if(part.type!=='file')continue
    if(!part.filename.toLowerCase().endsWith('.pdf'))return reply.status(400).send({message:'PDF files only.'})
    const buf=await part.toBuffer()
    const pdf=await PDFDocument.load(buf)
    const id=`${crypto.randomUUID()}.pdf`
    await fs.writeFile(path.join(dir,id),buf)
    out.push({fileId:id,fileName:part.filename,pages:pdf.getPageCount()})
   }
   if(!out.length)return reply.status(400).send({message:'No PDF files uploaded.'})
   return {files:out}
  }catch(e){req.log.error(e);return reply.status(500).send({message:e instanceof Error?e.message:'Upload failed.'})}
 })
}