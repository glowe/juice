var firejuice = {
    send_errors_to_emacs: function() {
        var converter, errors, file, fo_stream, process, shell, shell_args, shell_path = "/bin/sh";
        if (!content.wrappedJSObject.juice) {
            return;
        }

        try {
            errors = JSON.stringify(content.wrappedJSObject.juice.errors);

            file = Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties)
                .get("TmpD", Components.interfaces.nsIFile);

            file.append("firejuice-errors.tmp");
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0755);
            fo_stream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                createInstance(Components.interfaces.nsIFileOutputStream);

            fo_stream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
            converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(fo_stream, "UTF-8", 0, 0);
            converter.writeString(errors);
            converter.close(); // this closes fo_stream

            shell = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            shell.initWithPath(shell_path);
            if (!shell.exists()) {
                throw "Can't find shell (" + shell_path + ")";
            }
            process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
            process.init(shell);
            shell_args = ['-c', 'emacsclient --eval \'(firejuice:handle-json-errors "' + file.path + '")\''];
            process.run(true, shell_args, shell_args.length);
        }
        catch (e) {
            alert(e);
        }
    }
};
