import { Router } from 'express';

const v1Router = Router();

v1Router.get('/', (req, res) => {
  res.send('Hello, World!');
});

import openingsRouter from './openings';

v1Router.use('/openings', openingsRouter);

export default v1Router;
