const { Good, Auction, User, Op, Sequelize, sequelize } = require("./models");
const schedule = require("node-schedule");
module.exports = async () => {
  console.log("checkAuction");
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // 어제 시간
    const targets = await Good.findAll({
      where: {
        SoldId: null,
        createdAt: { [Op.lte]: yesterday },
      },
    });
    targets.forEach(async (target) => {
      const t = await sequelize.transaction();
      try {
        const success = await Auction.findOne({
          where: { GoodId: target.id },
          order: [["bid", "DESC"]],
          transaction: t,
        });
        await Good.update(
          { SoldId: success.UserId },
          {
            where: { id: target.id },
            transaction: t,
          }
        );
        await User.update(
          { money: Sequelize.literal(`money - ${success.bid}`) },
          {
            where: { id: success.UserId },
            transaction: t,
          }
        );
        t.commit();
      } catch (error) {
        t.rollback();
      }
      const unsold = await Good.findAll({
        where: {
          SoldId: null,
          createdAt: { [Op.gt]: yesterday },
        },
      });
      unsold.forEach((target) => {
        const end = new Date(target.createdAt);
        end.setDate(end.getDate() + 1);
        schedule.scheduleJob(end, async () => {
          const t = await sequelize.transaction();
          try {
            const success = await Auction.findOne({
              where: {
                GoodId: target.id,
              },
              order: [["bid", "DESC"]],
              transaction: t,
            });
            // await good.setSold(success.UserId);
            await Good.update(
              { SoldId: success.UserId },
              {
                where: { id: target.id },
                transaction: t,
              }
            );
            await User.update(
              { money: Sequelize.literal(`money-${success.bid}`) },
              {
                where: { id: target.id },
                transaction: t,
              }
            );
            await t.commit();
          } catch (error) {
            console.log(error);
            await t.rollback();
          }
        });
      });
    });
  } catch (error) {
    console.error(error);
  }
};
