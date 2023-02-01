const Discord = require('discord.js')
const client = new Discord.Client({
    intents: 32767
})
const tw = require('@fortune-inc/tw-voucher')
const config = require('./config.json')
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const fs = require('fs');

const express = require('express')
const app = express();
const port = 8000
 
app.get('/' , (req,res) => res.send('Working!'))
app.listen( port , () => 
  console.log(`Your app is listening a http://localhost:${port}`)
);

let commands = [];
fs.readdir('commands', (err, files) => {
    if (err) throw err;
    files.forEach(async (f) => {
        try {
            let props = require(`./commands/${f}`);
            commands.push({
                name: props.name,
                description: props.description,
                options: props.options
            });
        } catch (err) {
            console.log(err);
        }
    });
});
client.on('interactionCreate', async (interaction) => {
	if (interaction.type != 2) return;
    fs.readdir('commands', (err, files) => {
        if (err) throw err;
        files.forEach(async (f) => {
            let props = require(`./commands/${f}`);
            if (interaction.commandName.toLowerCase() === props.name.toLowerCase()) {
                try {
                    if ((props?.permissions?.length || [].length) > 0) {
                        (props?.permissions || [])?.map(perm => {
                            if (interaction.member.permissions.has(config.permissions[perm])) {
                                return props.run(client, interaction);
                            } else {
                                return interaction.reply({ content: `Missing permission: **${perm}**`, ephemeral: true });
                            }
                        })
                    } else {
                        return props.run(client, interaction);
                    }
                } catch (e) {
                    return interaction.reply({ content: `Something went wrong...\n\n\`\`\`${e.message}\`\`\``, ephemeral: true });
                }
            }
        });
    });
});
const rest = new REST({ version: "9" }).setToken(config.token);
client.once("ready", () => {
    (async () => {
        try {
            await rest.put(Routes.applicationCommands(client.user.id), {
                body: await commands,
            });
            console.log(`Login : ${client.user.tag}`);
        } catch { };
    })();
});
client.login(config.token)

client.on("interactionCreate", async (interaction) => {

    if (interaction.isButton()) {
        if (interaction.customId == "เติมเงิน") {
            const modal = new Discord.ModalBuilder()
                .setCustomId('topup')
                .setTitle('ซองอังเปา(ไม่มีการคืนเงิน)');
            const codeInput = new Discord.TextInputBuilder()
                .setCustomId('codeInput')
                .setLabel("ลิ้งค์ซองอังเปา")
                .setPlaceholder('https://gift.truemoney.com/campaign/?v=xxxxxxxxxxxxxxx')
                .setStyle(Discord.TextInputStyle.Short);
            const codeInputActionRow = new Discord.ActionRowBuilder().addComponents(codeInput);
            modal.addComponents(codeInputActionRow);
            await interaction.showModal(modal);
        }
    }
    if (interaction.isButton()) {
        if (interaction.customId == "ช่วยเหลือ") {
            await interaction.reply({ embeds: [new Discord.EmbedBuilder().setColor("Green").setTitle("ราคาทั้งหมด").setDescription(`เติมเงิน 100บาท จะได้ยศ\n-> <@&995211403533234286> <@&995212932596121671> <@&995214574028607539> <@&995215643626459136> <@&998548719387553892>\nเติมเงิน 200บาท จะได้ยศ\n-> <@&${config.role200}>\nเติมเงิน 500บาท จะได้ยศ\n-> <@&${config.role500}>`)], ephemeral: true})
        }
    }
    if (interaction.type === 5){
        if (interaction.customId === "topup") {
            const codeInput =  interaction.fields.getTextInputValue('codeInput')
            console.log(`URL:${codeInput}   DISCORD-ID:${interaction.user.id}`)
            if(!codeInput.includes("https://gift.truemoney.com/campaign/?v")) return await interaction.reply({ embeds: [
                new Discord.EmbedBuilder()
                .setColor("Red")
                .setDescription('เติมเงินไม่สำเร็จ : ลิ้งค์รับเงินแล้ว/ลิ้งค์ผิด')
            ], ephemeral: true})

            tw(config.phone, codeInput).then(async re => {
                switch  (re.amount) {
                        case 100:
                            await interaction.member.roles.add('995211403533234286')
                            await interaction.member.roles.add('995212932596121671')
                            await interaction.member.roles.add('995214574028607539')
                            await interaction.member.roles.add('995215643626459136')
                            await interaction.member.roles.add('998548719387553892')
                            await interaction.reply({ embeds: [new Discord.EmbedBuilder().setColor("Green").setDescription("เติมเงินสำเร็จ")], ephemeral: true})
                            await interaction.guild.channels.cache.get(config.channellog).send({ 
                                embeds: [
                                    new Discord.EmbedBuilder()
                                    .setDescription(`เติมเงินสำเร็จ ${re.amount} โดย <@${interaction.user.id}>`)
                                    .addFields({
                                        name: `คุณได้รับยศ`,
                                        value: " •<@&995211403533234286>\n •<@&995212932596121671>\n •<@&995214574028607539>\n •<@&995215643626459136>\n •<@&998548719387553892>\n"
                                    })
                                    .setColor("Green")
                                ]})
                        break;
                            case 200:
                                if(interaction.member.roles.cache.has(config.role200)){
                                    await interaction.reply({ embeds: [new Discord.EmbedBuilder().setColor("Green").setDescription("เติมเงินสำเร็จ : คุณมียศอยู่แล้ว")], ephemeral: true})
                                    await interaction.guild.channels.cache.get(config.channellog).send({ embeds: [
                                        new Discord.EmbedBuilder()
                                        .setDescription(`เติมเงินสำเร็จ ${re.amount} โดย <@${interaction.user.id}>`)
                                        .addFields({
                                            name: `คุณได้รับยศ`,
                                            value: `• <@&${config.role200}>`
                                        })
                                        .setColor("Green")
                                    ]})
                                }else{
                                    await interaction.member.roles.add(config.role200)
                                    await interaction.reply({ embeds: [new Discord.EmbedBuilder().setColor("Green").setDescription("เติมเงินสำเร็จ")], ephemeral: true})
                                    await interaction.guild.channels.cache.get(config.channellog).send({ embeds: [
                                        new Discord.EmbedBuilder()
                                        .setDescription(`เติมเงินสำเร็จ ${re.amount} โดย <@${interaction.user.id}>`)
                                        .addFields({
                                            name: `คุณได้รับยศ`,
                                            value: `• <@&${config.role200}>`
                                        })
                                        .setColor("Green")
                                    ]})
                                }

     
                            break;
                                case 500:
                                    if(interaction.member.roles.cache.has(config.role500)){
                                        await interaction.reply({ embeds: [new Discord.EmbedBuilder().setColor("Green").setDescription("เติมเงินสำเร็จ : คุณมียศอยู่แล้ว")], ephemeral: true})
                                        await interaction.guild.channels.cache.get(config.channellog).send({ embeds: [
                                            new Discord.EmbedBuilder()
                                            .setDescription(`เติมเงินสำเร็จ ${re.amount} โดย <@${interaction.user.id}>`)
                                            .addFields({
                                                name: `คุณได้รับยศ`,
                                                value: `• <@&${config.role500}>`
                                            })
                                            .setColor("Green")
                                        ]})
                                    }else{
                                        await interaction.member.roles.add(config.role500)
                                        await interaction.reply({ embeds: [new Discord.EmbedBuilder().setColor("Green").setDescription("เติมเงินสำเร็จ")], ephemeral: true})
                                        await interaction.guild.channels.cache.get(config.channellog).send({ embeds: [
                                            new Discord.EmbedBuilder()
                                            .setDescription(`เติมเงินสำเร็จ ${re.amount} โดย <@${interaction.user.id}>`)
                                            .addFields({
                                                name: `คุณได้รับยศ`,
                                                value: `• <@&${config.role500}>`
                                            })
                                            .setColor("Green")
                                        ]})
                                    }
                                break;
                    default:
                        break;
                }
            }).catch(async e => {
                await interaction.reply({ embeds: [new Discord.EmbedBuilder().setColor("Red").setDescription("ลิงค์ผิดหรืออาจมีคนใช้ไปแล้ว")], ephemeral: true})
            })
        }
    };
})