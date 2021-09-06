const fs = require( 'fs' );
const path = require( 'path' );

module.exports = ( client ) => {

	try {

		// read the modules text file in root dir
		// path.dirname(__dirname) returns the parent folder
		let modules = fs.readFileSync( path.dirname( __dirname ) + `/lists/modules.txt`, 'utf8' ).split( '\n' );
		let cleaned = [];

		// weed out any commands, blank spaces, and duplicates
		modules.forEach( ( module ) => {
			module = module.toLowerCase().replace( /[\n\r]/g, '' );
			if ( module.startsWith( '#' ) || !module ) {
				return;
			}
			if ( !cleaned.includes( module.toLowerCase() ) ) {
				cleaned.push( module.toLowerCase() );
			}

		} );

		// actual loading of modules using require and sending client
		cleaned.forEach( ( module ) => {

			client.log( `Loading module ${module}...` );

			try {

				require( path.dirname( __dirname ) + `/modules/${module}.js` )( client );
				client.log( `Loaded module ${module}!` );
			} catch ( e ) {

				client.error( `Error while loading module: ${e}` );

			}

		} );
	} catch ( e ) {

		client.error( `Error occured while loading modules: ${e.stack}` );
		client.error( `Now exiting...` );
		process.exit( 1 );

	}

};
