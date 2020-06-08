const Usuario = require('../models/Usuario');
const Proyecto = require('../models/Proyecto');
const Tarea = require('../models/Tarea');


const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path:'variables.env'});

 

//crea y firma un jWT
const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre} = usuario;

    return jwt.sign({id, email, nombre}, secreta, {expiresIn});
}

const resolvers = {
    Query: {
        obtenerProyectos: async (_, {}, ctx) => {
            const proyectos = await Proyecto.find({creador: ctx.usuario.id});
            return proyectos;
        },
        obtenerTareas: async (_, {input}, ctx) => { 
            const tareas = await Tarea.find({creador: ctx.usuario.id}).where('proyecto').equals(input.proyecto);
            return tareas;
        }
       
    },
    Mutation: {
        crearUsuario: async (_, {input}) => {
            
            const { email, password} = input;
            const existeUsuario = await Usuario.findOne({email});

            //Si existe el usuario
            if(existeUsuario) {
                throw new Error('El usuario ya esta registrado');
            }

            try {

                //hashear password
                const salt = await bcryptjs.genSalt(10);
                input.password = await bcryptjs.hash(password, salt);
                

                //registrra nuevo usuario
                const nuevoUsuario = new Usuario(input);
                //console.log(nuevoUsuario);

                nuevoUsuario.save();
                return "Usuario creado correctamente";
            } catch (error) {
                console.log(error);
            }


        },
        autenticarUsuario: async (_, {input}) => { 
            const { email, password} = input;

            //si el usuario existe
            const existeUsuario = await Usuario.findOne({email});
            if(!existeUsuario) {
                throw new Error('El usuario no existe');
            }


            //si el password es correcto
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);

            if(!passwordCorrecto)
            throw new Error('Password incorrecto');

            //dar acceso a la app
            return {
                token: crearToken(existeUsuario, process.env.SECRETA,'12hr')
            }

        },
        nuevoProyecto: async (_, {input}, ctx) => { 

                try {
                    const proyecto = new Proyecto(input);

                    //asociar al creador
                    proyecto.creador = ctx.usuario.id;

                    //almacenar en la BD
                    const resultado = await proyecto.save();
        
                    return resultado;
                    
                } catch (error) {
                    console.log(error);
                    
                }
        },
        actualizarProyecto: async (_, {id, input}, ctx) => { 
            // revisar si el proyecto existe
            let proyecto = await Proyecto.findById(id);

            if(!proyecto) {
                throw new Error('Proyecto no encontrado');
            }
            //revisar si es la persona que lo creo
            if(proyecto.creador.toString() != ctx.usuario.id) {
                throw new Error('No tienes acceso para  editar');
            }
            //Guardar el proyecto
            proyecto = await Proyecto.findOneAndUpdate({_id: id} , input,{new: true});
            return proyecto;
        },

        elimiarProyecto: async (_, {id}, ctx) => {  
             // revisar si el proyecto existe
             let proyecto = await Proyecto.findById(id);

             if(!proyecto) {
                 throw new Error('Proyecto no encontrado');
             }
             //revisar si es la persona que lo creo
             if(proyecto.creador.toString() != ctx.usuario.id) {
                 throw new Error('No tienes acceso para  editar');
             }

             //ELimiar proyecto
             await Proyecto.findByIdAndDelete({_id : id});
             return "Proyecto Eliminado";
        
        },
            nuevaTarea: async (_, {input}, ctx) => { 
                    try {
                        const tarea = new Tarea(input);
                        tarea.creador = ctx.usuario.id;
                        const resultado = await tarea.save();
                        return resultado;
                    } catch (error) {
                        console.log(error);
                    }

         
        },
        actualizarTarea: async (_, {id, input, estado}, ctx) => { 
            //si la tarea existe o no
            let tarea = await Tarea.findById(id);

            if(!tarea) {
                throw new Error('Tarea no encontrado');
            }
            //revisar si es la persona que lo creo
            if(tarea.creador.toString() != ctx.usuario.id) {
                throw new Error('No tienes acceso para  editar');
            }
            //asignar el estado
            input.estado = estado;

            //guardar y retornar la tarea
            tarea = await Tarea.findOneAndUpdate({_id : id}, input, {new: true});

            return tarea;
        },
        elimiarTarea: async (_, {id}, ctx) => {  

            // revisar si el tarea existe
            let tarea = await Tarea.findById(id);

            if(!tarea) {
                throw new Error('Tarea no encontrado');
            }
            //revisar si es la persona que lo creo
            if(tarea.creador.toString() != ctx.usuario.id) {
                throw new Error('No tienes acceso para  editar');
            }

            //ELimiar proyecto
            await Tarea.findOneAndDelete({_id : id});
            return " Tarea eliminada";
       
       }
      
    }
}

module.exports = resolvers;