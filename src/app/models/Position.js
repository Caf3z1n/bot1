/* eslint-disable no-nested-ternary */
import Sequelize, { Model } from 'sequelize';
import { format, differenceInMinutes } from 'date-fns';

class Position extends Model {
  static init(sequelize) {
    super.init(
      {
        // IDs de ordens (para reconciliação)
        entryId: Sequelize.STRING,
        tpId: Sequelize.STRING,
        slId: Sequelize.STRING,

        // Identificação
        symbol: { type: Sequelize.STRING(20) },
        side: { type: Sequelize.ENUM('LONG', 'SHORT'), defaultValue: 'LONG' },

        // Tamanho / preços
        qty: Sequelize.DECIMAL(30, 4),
        price: Sequelize.DECIMAL(30, 4),
        entryPrice: Sequelize.DECIMAL(30, 4),
        notionalUsd: Sequelize.DECIMAL(30, 2),

        // Preços dos alvos
        tpPrice: Sequelize.DECIMAL(30, 4),
        slPrice: Sequelize.DECIMAL(30, 4),

        // Estado/resultado
        closed: { type: Sequelize.BOOLEAN, defaultValue: false },
        result: Sequelize.ENUM(
          'PROFIT',
          'LOSS',
          'BREAKEVEN',
          'MANUAL',
          'UNKNOWN'
        ),
        tpUsd: Sequelize.DECIMAL(30, 2),
        slUsd: Sequelize.DECIMAL(30, 2),
        pnlRealised: Sequelize.DECIMAL(30, 2),
        fees: Sequelize.DECIMAL(30, 8),

        // Horários
        entryTime: Sequelize.DATE,
        exitTime: Sequelize.DATE,

        // -------- Virtuais (somente leitura) --------
        entry_br: {
          type: Sequelize.VIRTUAL,
          get() {
            const t = this.getDataValue('entryTime');
            return t ? format(new Date(t), 'dd/MM/yyyy HH:mm') : null;
          },
        },
        exit_br: {
          type: Sequelize.VIRTUAL,
          get() {
            const t = this.getDataValue('exitTime');
            return t ? format(new Date(t), 'dd/MM/yyyy HH:mm') : null;
          },
        },
        duration_min: {
          type: Sequelize.VIRTUAL,
          get() {
            const a = this.getDataValue('entryTime');
            const b = this.getDataValue('exitTime');
            return a && b
              ? differenceInMinutes(new Date(b), new Date(a))
              : null;
          },
        },
        pnl_label: {
          type: Sequelize.VIRTUAL,
          get() {
            const v = this.getDataValue('pnlRealised');
            if (v == null) return null;
            const num = Number(v);
            return num >= 0
              ? `+$${num.toFixed(2)}`
              : `-$${Math.abs(num).toFixed(2)}`;
          },
        },
      },
      {
        sequelize,
      }
    );

    return this;
  }
}

export default Position;
