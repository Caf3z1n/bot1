module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('Positions', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      // Identificação
      symbol: { type: Sequelize.STRING(20), allowNull: false }, // ex: BTCUSDT
      side: {
        type: Sequelize.ENUM('LONG', 'SHORT'),
        allowNull: false,
        defaultValue: 'LONG',
      },
      entryId: { type: Sequelize.STRING, allowNull: false },
      tpId: { type: Sequelize.STRING, allowNull: false },
      slId: { type: Sequelize.STRING, allowNull: false },

      // Tamanho / preços
      qty: { type: Sequelize.DECIMAL(30, 4), allowNull: false }, // tamanho (contratos/moedas)
      price: { type: Sequelize.DECIMAL(30, 4), allowNull: false }, // Preço usado nos calculos de entrada
      entryPrice: { type: Sequelize.DECIMAL(30, 4), allowNull: true }, // Preço de entrada executada
      notionalUsd: { type: Sequelize.DECIMAL(30, 2), allowNull: false }, // qty * entryPrice

      // Alvos em preços
      tpPrice: { type: Sequelize.DECIMAL(30, 4), allowNull: true },
      slPrice: { type: Sequelize.DECIMAL(30, 4), allowNull: true },

      // Estado/fechamento
      closed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      result: {
        type: Sequelize.ENUM(
          'PROFIT',
          'LOSS',
          'BREAKEVEN',
          'MANUAL',
          'UNKNOWN'
        ),
        allowNull: true,
      },
      tpUsd: { type: Sequelize.DECIMAL(30, 2), allowNull: true },
      slUsd: { type: Sequelize.DECIMAL(30, 2), allowNull: true },
      pnlRealised: { type: Sequelize.DECIMAL(30, 2), allowNull: true }, // lucro/prejuízo realizado
      fees: { type: Sequelize.DECIMAL(30, 8), allowNull: true },

      // Horários
      entryTime: { type: Sequelize.DATE, allowNull: false },
      exitTime: { type: Sequelize.DATE, allowNull: true },

      // Datas padrões
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    }),

  down: (queryInterface) => queryInterface.dropTable('Positions'),
};
