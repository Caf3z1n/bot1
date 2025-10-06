import Position from '../models/Position';

class PositionController {
  async index(req, res) {
    const positions = await Position.findAll({
      order: [['id', 'DESC']],
    });

    return res.json({ positions });
  }
}

export default new PositionController();
