import  * as express from 'express'
import {Request, Response} from "express";
import * as cors from 'cors'
import {createConnection} from "typeorm";
import {Product} from "./entity/product";
import * as amqp from 'amqplib/callback_api'
import {Buffer} from "buffer";

createConnection().then(db => {
    const productRespository = db.getRepository(Product);


    amqp.connect('amqps://avtfmtry:hVNcvxdjHsKRnv1DCwrDNri8_Y3OITO6@baboon.rmq.cloudamqp.com/avtfmtry',
        (error0, connecction)=>{
            if(error0){
                throw error0
            }

            connecction.createChannel((error1, channel) => {

                const app = express()

                app.use(cors({
                    origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:4200']
                }))

                app.use(express.json())

                app.get('/api/products', async (req: Request, res: Response)=>{
                    const products = await productRespository.find();

                    res.json(products)
                })

                app.post('/api/products', async (req: Request, res: Response)=>{
                    const product = await productRespository.create(req.body);
                    const result = await productRespository.save(product);
                    channel.sendToQueue('product_created', Buffer.from(JSON.stringify(result)))
                    return res.json(result);

                })

                app.get('/api/products/:id', async (req: Request, res: Response)=>{
                    const product = await productRespository.findOne(req.params.id);
                    return res.json(product);

                })

                app.put('/api/products/:id', async (req: Request, res: Response) =>{
                    const product = await productRespository.findOne(req.params.id);
                    productRespository.merge(product, req.body);
                    const result = await productRespository.save(product);
                    channel.sendToQueue('product_updated', Buffer.from(JSON.stringify(result)))
                    return res.send(result);

                })

                app.delete('/api/products/:id', async (req: Request, res: Response)=>{
                    const product = await productRespository.findOne(req.params.id);
                    const result = await productRespository.delete(product);
                    channel.sendToQueue('product_deleted', Buffer.from(req.params.id))
                    return  res.json(result);
                })

                app.post('/api/products/:id/like', async (req: Request, res: Response)=>{
                    const product = await productRespository.findOne(req.params.id)
                    product.likes++
                    const result = await productRespository.save(product);
                    return res.json(result)

                })

                console.log('Listening to port: 8000')
                app.listen(8000)
                process.on('beforeExit', () => {
                    console.log('closing')
                    connecction.close()
                })

            })
        })


})